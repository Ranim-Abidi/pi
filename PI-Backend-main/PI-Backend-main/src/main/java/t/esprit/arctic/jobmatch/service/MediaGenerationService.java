package t.esprit.arctic.jobmatch.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.*;

@Service
public class MediaGenerationService {

    @Value("${gemini.api.key:}")
    private String groqApiKey;

    @Value("${huggingface.api.key:}")
    private String huggingFaceApiKey;

    @Value("${replicate.api.key:}")
    private String replicateApiKey;

    private final HttpClient   http   = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    // ══════════════════════════════════════════════════════════════
    // EXTRACTION TEXTE
    // ══════════════════════════════════════════════════════════════

    public String extractTextFromFile(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) return "";
        String name = file.getOriginalFilename() != null
                ? file.getOriginalFilename().toLowerCase() : "";

        if (name.endsWith(".pdf"))
            return extractPdf(file);
        if (name.endsWith(".docx") || name.endsWith(".doc"))
            return extractDocx(file);
        return new String(file.getBytes());
    }

    private String extractPdf(MultipartFile file) throws Exception {
        try (InputStream is = file.getInputStream();
             PDDocument doc = PDDocument.load(is)) {
            return new PDFTextStripper().getText(doc);
        }
    }

    private String extractDocx(MultipartFile file) throws Exception {
        try (InputStream is = file.getInputStream();
             XWPFDocument doc = new XWPFDocument(is);
             XWPFWordExtractor ex = new XWPFWordExtractor(doc)) {
            return ex.getText();
        }
    }

    // ══════════════════════════════════════════════════════════════
    // RÉSUMÉ VIA GROQ
    // ══════════════════════════════════════════════════════════════

    public String resumerTexte(String texte, String langue) throws Exception {
        String prompt = """
            Résume ce texte de façon claire et structurée en %s.
            Utilise des bullet points.
            Garde les informations essentielles.
            Texte : %s
            """.formatted(
                "fr".equals(langue) ? "français" : "English",
                texte.length() > 3000 ? texte.substring(0, 3000) + "..." : texte
        );

        return callGroq(prompt, 600);
    }

    // ══════════════════════════════════════════════════════════════
    // GÉNÉRATION PROMPT IMAGE (GROQ → prompt anglais pour les APIs)
    // ══════════════════════════════════════════════════════════════

    public String genererPromptImage(String texte, String style) throws Exception {
        String styleDesc = switch (style) {
            case "realistic"   -> "photorealistic, ultra detailed, 8K";
            case "artistic"    -> "digital painting, concept art, vibrant colors";
            case "minimalist"  -> "minimalist flat design, clean, simple icons";
            case "infographic" -> "clean infographic style, icons, no text labels";
            default            -> "high quality illustration";
        };

        String prompt = """
            You are an expert AI image prompt engineer.
            Based on this content, create ONE detailed English image prompt.
            Style: %s
            RULES:
            - No text, no words, no labels in the image
            - Focus on visual metaphors and objects
            - Max 120 words
            - Output ONLY the prompt, nothing else
            
            Content: %s
            """.formatted(
                styleDesc,
                texte.length() > 1500 ? texte.substring(0, 1500) : texte
        );

        return callGroq(prompt, 200);
    }

    // ══════════════════════════════════════════════════════════════
    // GÉNÉRATION IMAGE — Hugging Face (100% gratuit)
    // ══════════════════════════════════════════════════════════════

    public String genererImage(String promptImage) throws Exception {
        if (huggingFaceApiKey == null || huggingFaceApiKey.isEmpty()) {
            throw new RuntimeException(
                    "Clé Hugging Face manquante. " +
                            "Créez un compte sur huggingface.co et ajoutez la clé dans application.properties");
        }

        // SDXL — meilleur modèle gratuit disponible
        String modelUrl =
                "https://router.huggingface.co/hf-inference/models/" +
                        "stabilityai/stable-diffusion-xl-base-1.0";

        String body = mapper.writeValueAsString(Map.of(
                "inputs", promptImage,
                "parameters", Map.of(
                        "num_inference_steps", 25,
                        "guidance_scale",      7.5,
                        "width",               1024,
                        "height",              768
                )
        ));

        int maxRetries = 5;
        for (int attempt = 0; attempt < maxRetries; attempt++) {
            HttpResponse<byte[]> resp = http.send(
                    HttpRequest.newBuilder()
                            .uri(URI.create(modelUrl))
                            .header("Content-Type",  "application/json")
                            .header("Authorization", "Bearer " + huggingFaceApiKey)
                            .POST(HttpRequest.BodyPublishers.ofString(body))
                            .build(),
                    HttpResponse.BodyHandlers.ofByteArray()
            );

            if (resp.statusCode() == 200) {
                String b64 = Base64.getEncoder().encodeToString(resp.body());
                return "data:image/jpeg;base64," + b64;
            }

            if (resp.statusCode() == 503) {
                // Modèle en cours de chargement → attendre
                try {
                    JsonNode err = mapper.readTree(resp.body());
                    double wait = err.has("estimated_time")
                            ? err.get("estimated_time").asDouble(20) : 20;
                    System.out.println(
                            "HF: modèle en chargement, attente " + wait + "s");
                    Thread.sleep((long)(wait * 1000) + 2000);
                } catch (Exception e) {
                    Thread.sleep(20000);
                }
                continue;
            }

            if (resp.statusCode() == 429 || resp.statusCode() >= 500) {
                Thread.sleep(15000);
                continue;
            }

            throw new RuntimeException(
                    "Erreur Hugging Face (" + resp.statusCode() + "): "
                            + new String(resp.body()));
        }
        throw new RuntimeException(
                "Hugging Face n'a pas répondu après " + maxRetries + " tentatives.");
    }

    // ══════════════════════════════════════════════════════════════
    // GÉNÉRATION VIDÉO — Replicate (crédits $5 offerts)
    // Modèle : zeroscope_v2_576w (vidéo courte gratuite)
    // ══════════════════════════════════════════════════════════════

    public Map<String, String> lancerGenerationVideo(
            String promptVideo) throws Exception {

        if (replicateApiKey == null || replicateApiKey.isEmpty()) {
            throw new RuntimeException(
                    "Clé Replicate manquante. " +
                            "Créez un compte sur replicate.com et ajoutez la clé.");
        }

        String body = mapper.writeValueAsString(Map.of(
                "version",
                "9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351",
                "input", Map.of(
                        "prompt",           promptVideo,
                        "num_frames",       24,
                        "width",            576,
                        "height",           320,
                        "num_inference_steps", 25,
                        "guidance_scale",   7.5
                )
        ));

        HttpResponse<String> resp = http.send(
                HttpRequest.newBuilder()
                        .uri(URI.create("https://api.replicate.com/v1/predictions"))
                        .header("Content-Type",  "application/json")
                        .header("Authorization", "Token " + replicateApiKey)
                        .POST(HttpRequest.BodyPublishers.ofString(body))
                        .build(),
                HttpResponse.BodyHandlers.ofString()
        );

        JsonNode root = mapper.readTree(resp.body());

        if (root.has("error")) {
            throw new RuntimeException(
                    "Replicate error: " + root.path("error").asText());
        }

        String predictionId = root.path("id").asText();
        String statusUrl    = root.path("urls").path("get").asText();

        return Map.of(
                "predictionId", predictionId,
                "statusUrl",    statusUrl,
                "status",       "processing"
        );
    }

    // ── Vérifier le statut d'une vidéo en cours ────────────────────
    public Map<String, Object> verifierStatutVideo(
            String predictionId) throws Exception {

        HttpResponse<String> resp = http.send(
                HttpRequest.newBuilder()
                        .uri(URI.create(
                                "https://api.replicate.com/v1/predictions/" + predictionId))
                        .header("Authorization", "Token " + replicateApiKey)
                        .GET()
                        .build(),
                HttpResponse.BodyHandlers.ofString()
        );

        JsonNode root   = mapper.readTree(resp.body());
        String  status  = root.path("status").asText("processing");

        Map<String, Object> result = new HashMap<>();
        result.put("status",       status);
        result.put("predictionId", predictionId);

        if ("succeeded".equals(status)) {
            JsonNode output = root.path("output");
            if (output.isArray() && output.size() > 0) {
                result.put("videoUrl", output.get(0).asText());
                result.put("status",   "completed");
            }
        } else if ("failed".equals(status) || "canceled".equals(status)) {
            result.put("error",  root.path("error").asText("Erreur inconnue"));
            result.put("status", "failed");
        }

        return result;
    }

    // ══════════════════════════════════════════════════════════════
    // UTILITAIRE — Appel GROQ
    // ══════════════════════════════════════════════════════════════

    private String callGroq(String userPrompt, int maxTokens) throws Exception {
        String body = mapper.writeValueAsString(Map.of(
                "model",    "llama-3.1-8b-instant",
                "messages", List.of(Map.of(
                        "role",    "user",
                        "content", userPrompt
                )),
                "temperature", 0.7,
                "max_tokens",  maxTokens
        ));

        HttpResponse<String> resp = http.send(
                HttpRequest.newBuilder()
                        .uri(URI.create(
                                "https://api.groq.com/openai/v1/chat/completions"))
                        .header("Content-Type",  "application/json")
                        .header("Authorization", "Bearer " + groqApiKey)
                        .POST(HttpRequest.BodyPublishers.ofString(body))
                        .build(),
                HttpResponse.BodyHandlers.ofString()
        );

        JsonNode root = mapper.readTree(resp.body());
        if (root.has("error"))
            throw new RuntimeException(
                    root.path("error").path("message").asText());

        return root.path("choices").get(0)
                .path("message").path("content").asText();
    }

    // ── Getter public pour convertTextToMediaPrompt ────────────────
    public String convertTextToMediaPrompt(
            String texte, String userPrompt) throws Exception {
        return genererPromptImage(
                texte + "\n\nUser request: " + userPrompt, "artistic");
    }
}