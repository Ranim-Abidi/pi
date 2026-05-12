package t.esprit.arctic.jobmatch.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.*;
import java.util.UUID;

import t.esprit.arctic.jobmatch.entity.ChatbotHistory;
import t.esprit.arctic.jobmatch.repository.ChatbotHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import java.io.ByteArrayInputStream;
import java.util.Base64;

@RestController
@RequestMapping("/api/chatbot")
public class ChatbotController {

    @Autowired
    private ChatbotHistoryRepository chatHistoryRepo;

    @Value("${gemini.api.key:}")
    private String groqApiKey;

    private final HttpClient   http   = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    private Map<String, Object> buildImageContent(String imageUrl) {
        if (imageUrl.startsWith("data:image")) {
            String mediaType  = "image/jpeg";
            String base64Data = imageUrl;
            if (imageUrl.contains(";base64,")) {
                String[] parts = imageUrl.split(";base64,");
                mediaType  = parts[0].replace("data:", "");
                base64Data = parts[1];
            }
            return Map.of(
                    "type", "image_url",
                    "image_url", Map.of("url", "data:" + mediaType + ";base64," + base64Data)
            );
        } else {
            return Map.of(
                    "type", "image_url",
                    "image_url", Map.of("url", imageUrl)
            );
        }
    }

    private String sanitizeImageUrlForDb(String imageUrl) {
        if (imageUrl != null && imageUrl.startsWith("data:image")) {
            String mediaType = "image/jpeg";
            if (imageUrl.contains(";base64,")) {
                mediaType = imageUrl.split(";base64,")[0].replace("data:", "");
            }
            return "[image:" + mediaType + "]";
        }
        return imageUrl;
    }

    private String sanitizeFileDataForDb(String fileData, String fileName) {
        if (fileData != null && fileData.startsWith("data:")) {
            String name = (fileName != null && !fileName.isEmpty()) ? fileName : "document";
            return "[file:" + name + "]";
        }
        return fileData;
    }

    @GetMapping("/history")
    public ResponseEntity<List<Map<String, Object>>> getHistory(
            @RequestParam Long candidatId,
            @RequestParam Long formationId) {

        List<ChatbotHistory> histories = chatHistoryRepo
                .findAllByCandidatIdAndFormationIdOrderByCreatedAtDesc(candidatId, formationId);
        List<Map<String, Object>> result = new ArrayList<>();

        for (ChatbotHistory h : histories) {
            Map<String, Object> sessionData = new HashMap<>();
            sessionData.put("id", h.getId());
            sessionData.put("sessionId", h.getSessionId());
            sessionData.put("sessionTitle", h.getSessionTitle());
            sessionData.put("createdAt", h.getCreatedAt() != null ? h.getCreatedAt().toString() : null);

            List<Map<String, String>> messages = new ArrayList<>();
            if (h.getHistoriqueJson() != null && !h.getHistoriqueJson().isEmpty()) {
                try {
                    messages = mapper.readValue(h.getHistoriqueJson(), List.class);
                } catch (Exception e) {}
            }
            sessionData.put("messages", messages);
            result.add(sessionData);
        }

        return ResponseEntity.ok(result);
    }

    @PutMapping("/session/{sessionId}")
    public ResponseEntity<?> updateSession(
            @PathVariable String sessionId,
            @RequestBody Map<String, Object> body) {

        Optional<ChatbotHistory> histOpt = chatHistoryRepo.findBySessionId(sessionId);
        if (!histOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        ChatbotHistory hist = histOpt.get();

        if (body.containsKey("sessionTitle")) {
            hist.setSessionTitle(body.get("sessionTitle").toString());
        }

        if (body.containsKey("messages")) {
            try {
                String json = mapper.writeValueAsString(body.get("messages"));
                hist.setHistoriqueJson(json);
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid messages format"));
            }
        }

        chatHistoryRepo.save(hist);
        return ResponseEntity.ok(Map.of("message", "Session updated successfully"));
    }

    @Transactional
    @DeleteMapping("/session/{sessionId}")
    public ResponseEntity<?> deleteSession(@PathVariable String sessionId) {
        try {
            Optional<ChatbotHistory> histOpt = chatHistoryRepo.findBySessionId(sessionId);
            if (histOpt.isPresent()) {
                chatHistoryRepo.deleteById(histOpt.get().getId());
                return ResponseEntity.ok(Map.of("message", "Session deleted successfully"));
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                    "error", e.getMessage() != null ? e.getMessage() : e.toString(),
                    "trace", Arrays.toString(e.getStackTrace())
            ));
        }
    }

    @PostMapping("/formation")
    public ResponseEntity<Map<String, String>> chat(
            @RequestBody Map<String, Object> body) throws Exception {

        String message   = body.getOrDefault("message", "").toString();
        String imageUrl  = body.containsKey("imageUrl") && body.get("imageUrl") != null
                ? body.get("imageUrl").toString() : null;

        String fileData  = body.containsKey("fileData") && body.get("fileData") != null
                ? body.get("fileData").toString() : null;
        String fileName  = body.containsKey("fileName") && body.get("fileName") != null
                ? body.get("fileName").toString() : null;
        String fileText  = body.containsKey("fileText") && body.get("fileText") != null
                ? body.get("fileText").toString() : null;

        if ((fileText == null || fileText.trim().isEmpty()) && fileData != null && fileData.contains(";base64,")) {
            try {
                String base64Data = fileData.split(";base64,")[1];
                byte[] decodedBytes = Base64.getDecoder().decode(base64Data);
                try (ByteArrayInputStream bis = new ByteArrayInputStream(decodedBytes)) {
                    if (fileName != null && fileName.toLowerCase().endsWith(".docx")) {
                        try (XWPFDocument document = new XWPFDocument(bis);
                             XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
                            fileText = extractor.getText();
                        }
                    } else if (fileName != null && fileName.toLowerCase().endsWith(".pdf")) {
                        try (PDDocument document = PDDocument.load(bis)) {
                            PDFTextStripper pdfStripper = new PDFTextStripper();
                            fileText = pdfStripper.getText(document);
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Backend document text extraction failed: " + e.getMessage());
            }
        }

        boolean hasImage = imageUrl != null && !imageUrl.trim().isEmpty();
        boolean hasFile  = (fileData != null && !fileData.trim().isEmpty())
                || (fileText != null && !fileText.trim().isEmpty());

        String titreFormation = body.getOrDefault("titreFormation", "").toString();
        String categorie      = body.getOrDefault("categorie", "").toString();
        String niveau         = body.getOrDefault("niveau", "").toString();
        String context        = body.getOrDefault("context", "video").toString();
        String sessionId      = body.containsKey("sessionId") && body.get("sessionId") != null
                ? body.get("sessionId").toString() : null;

        Long candidatId  = body.containsKey("candidatId")  && body.get("candidatId")  != null
                ? Long.parseLong(body.get("candidatId").toString())  : null;
        Long formationId = body.containsKey("formationId") && body.get("formationId") != null
                ? Long.parseLong(body.get("formationId").toString()) : null;

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> historyFromFrontend =
                body.containsKey("history") && body.get("history") != null
                        ? (List<Map<String, Object>>) body.get("history") : new ArrayList<>();

        if (message.isEmpty() && !hasImage && !hasFile) {
            return ResponseEntity.badRequest().body(Map.of("error", "Message vide"));
        }

        List<Map<String, Object>> dbHistoryList = new ArrayList<>();
        ChatbotHistory chatHistDb = null;

        if (candidatId != null && formationId != null) {
            if (sessionId != null && !sessionId.isEmpty()) {
                chatHistDb = chatHistoryRepo.findBySessionId(sessionId).orElse(null);
            }

            if (chatHistDb == null) {
                chatHistDb = new ChatbotHistory();
                chatHistDb.setCandidatId(candidatId);
                chatHistDb.setFormationId(formationId);
                chatHistDb.setSessionId(UUID.randomUUID().toString());
                chatHistDb.setCreatedAt(java.time.LocalDateTime.now());
                String titleSource = !message.isEmpty() ? message : (fileName != null ? fileName : "Document");
                String shortTitle  = titleSource.length() > 30 ? titleSource.substring(0, 30) + "..." : titleSource;
                chatHistDb.setSessionTitle(shortTitle);
            } else {
                if (chatHistDb.getHistoriqueJson() != null && !chatHistDb.getHistoriqueJson().isEmpty()) {
                    try {
                        dbHistoryList = mapper.readValue(chatHistDb.getHistoriqueJson(), List.class);
                    } catch (Exception e) {}
                }
            }
        }

        Map<String, Object> userMsgForDb = new HashMap<>();
        userMsgForDb.put("role", "user");
        userMsgForDb.put("content", message);
        if (hasImage) {
            userMsgForDb.put("imageUrl", sanitizeImageUrlForDb(imageUrl));
        }
        if (hasFile) {
            // Stocker le nom du fichier + le texte extrait (pas le base64 brut)
            userMsgForDb.put("fileName", fileName);
            if (fileText != null && !fileText.isEmpty()) {
                // Stocker un extrait du texte (max 500 chars pour ne pas saturer la BDD)
                String excerpt = fileText.length() > 500 ? fileText.substring(0, 500) + "..." : fileText;
                userMsgForDb.put("fileExcerpt", excerpt);
            } else {
                userMsgForDb.put("fileExcerpt", sanitizeFileDataForDb(fileData, fileName));
            }
        }
        dbHistoryList.add(userMsgForDb);

        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content",
                buildSystemPrompt(titreFormation, categorie, niveau, context)));

        List<Map<String, Object>> sourceHistory = (candidatId != null && formationId != null)
                ? dbHistoryList : historyFromFrontend;
        int historySizeToSend = (candidatId != null && formationId != null)
                ? sourceHistory.size() - 1 : sourceHistory.size();

        int start = Math.max(0, historySizeToSend - 8);
        boolean historyHasImage = false;

        for (int i = start; i < historySizeToSend; i++) {
            Map<String, Object> h = sourceHistory.get(i);
            String role           = h.getOrDefault("role", "user").toString();
            String contentText    = h.getOrDefault("content", "").toString();
            String imgUrl         = h.containsKey("imageUrl") && h.get("imageUrl") != null
                    ? h.get("imageUrl").toString() : null;

            boolean isPlaceholder = imgUrl != null && imgUrl.startsWith("[image:");
            boolean hasRealImg    = imgUrl != null && !imgUrl.trim().isEmpty() && !isPlaceholder;

            String fileExcerptHist = h.containsKey("fileExcerpt") && h.get("fileExcerpt") != null
                    ? h.get("fileExcerpt").toString() : null;
            String fileNameHist    = h.containsKey("fileName") && h.get("fileName") != null
                    ? h.get("fileName").toString() : null;

            String enrichedContent = contentText;
            if (fileExcerptHist != null && !fileExcerptHist.startsWith("[file:")) {
                enrichedContent += "\n\n[Contenu du document '" + fileNameHist + "':\n" + fileExcerptHist + "]";
            }

            if (hasRealImg) {
                historyHasImage = true;
                messages.add(Map.of(
                        "role", role,
                        "content", List.of(
                                Map.of("type", "text", "text", enrichedContent),
                                buildImageContent(imgUrl)
                        )
                ));
            } else {
                messages.add(Map.of("role", role, "content", enrichedContent));
            }
        }

        String userMessageFull = message;

        if (hasFile && fileText != null && !fileText.trim().isEmpty()) {
            // Tronquer à 6000 chars pour éviter la limite de tokens Groq (6000 TPM)
            String truncated = fileText.length() > 6000
                    ? fileText.substring(0, 6000) + "\n...[document tronqué]"
                    : fileText;
            String prompt = message.isEmpty() ? "Analyse ce document." : message;
            userMessageFull = prompt + "\n\n[CONTENU DU DOCUMENT JOINT '" + fileName + "']:\n" + truncated;
        } else if (hasFile && (fileData != null && !fileData.trim().isEmpty())) {
            String prompt = message.isEmpty()
                    ? "J'ai joint le document: " + fileName + ". Analyse-le par rapport à la formation \"" + titreFormation + "\"."
                    : message;
            userMessageFull = prompt + "\n\n[Document joint: " + fileName + " - le texte n'a pas pu être extrait]";
        }

        if (hasImage) {
            historyHasImage = true;
            String fallbackImgPrompt = "Analyse cette image.";
            String txtToSend = userMessageFull.isEmpty() ? fallbackImgPrompt : userMessageFull;

            List<Map<String, Object>> contentParts = new ArrayList<>();
            contentParts.add(Map.of("type", "text", "text", txtToSend));
            contentParts.add(buildImageContent(imageUrl));
            messages.add(Map.of("role", "user", "content", contentParts));
        } else {
            messages.add(Map.of("role", "user", "content",
                    userMessageFull.isEmpty() ? "." : userMessageFull));
        }

        String modelToUse = (hasImage || historyHasImage)
                ? "meta-llama/llama-4-scout-17b-16e-instruct"
                : "llama-3.1-8b-instant";

        String requestBody = mapper.writeValueAsString(Map.of(
                "model",       modelToUse,
                "messages",    messages,
                "temperature", 0.1,
                "max_tokens",  1024
        ));

        System.out.println("=== GROQ REQUEST ===");
        System.out.println("Model: " + modelToUse);
        System.out.println("Has image: " + hasImage + " | Has file: " + hasFile);

        HttpResponse<String> response = http.send(
                HttpRequest.newBuilder()
                        .uri(URI.create("https://api.groq.com/openai/v1/chat/completions"))
                        .header("Content-Type",  "application/json")
                        .header("Authorization", "Bearer " + groqApiKey)
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                        .build(),
                HttpResponse.BodyHandlers.ofString()
        );

        System.out.println("=== GROQ RESPONSE STATUS: " + response.statusCode() + " ===");

        JsonNode root = mapper.readTree(response.body());

        if (root.has("error")) {
            String errMsg = root.path("error").path("message").asText();
            System.err.println("GROQ error: " + errMsg);
            return ResponseEntity.ok(Map.of(
                    "response", "Désolé, je rencontre un problème technique : " + errMsg
            ));
        }

        String reply = root.path("choices").get(0)
                .path("message").path("content").asText("Pas de réponse.");

        if (chatHistDb != null && candidatId != null && formationId != null) {
            Map<String, Object> aiMsgMap = new HashMap<>();
            aiMsgMap.put("role", "assistant");
            aiMsgMap.put("content", reply);
            dbHistoryList.add(aiMsgMap);
            chatHistDb.setHistoriqueJson(mapper.writeValueAsString(dbHistoryList));
            chatHistoryRepo.save(chatHistDb);

            Map<String, String> result = new HashMap<>();
            result.put("response", reply);
            result.put("sessionId", chatHistDb.getSessionId());
            result.put("sessionTitle", chatHistDb.getSessionTitle());
            return ResponseEntity.ok(result);
        }

        return ResponseEntity.ok(Map.of("response", reply));
    }

    private String buildSystemPrompt(String titre, String categorie, String niveau, String context) {

        return String.format("""
            You are a pedagogical AI assistant.
            
            Training: "%s"
            Category: %s
            Level: %s
            
            === TOPIC RELEVANCE RULE ===
            You must assist the user ONLY with topics directly related to the training "%s".
            
            HOW TO DETERMINE RELEVANCE:
            - Accept slight variations in names (e.g., "Power BI" is the same as "Power BIiii").
            - FOR DOCUMENTS:
                * Check if the document focuses on the core concepts, tools, or techniques of "%s" (e.g., for Power BI, look for DAX, Power Query, Data Modeling, etc.).
                * If the document is about a GENERAL or DIFFERENT subject (e.g., English lessons, general management, or project management not specific to the tool), it is OFF-TOPIC.
                * IMPORTANT: if the document text is missing, partial, noisy, or could not be extracted, DO NOT classify it as OFF-TOPIC by default.
                * In that case, ask the user to upload a clearer/searchable document (or paste an excerpt) and continue helping on the training topic.
            
            IF THE CONTENT IS CLEARLY OFF-TOPIC:
            - You MUST refuse to analyze, describe, or summarize it.
            - You MUST output ONLY the following refusal sentence and NOTHING ELSE.
            - NO analysis, NO notes, NO suggestions, NO "I am here to help with...".
            
            EXACT REFUSAL PHRASING (use the one matching the user's language):
            - FRENCH: "Cette image/question/document ne semble pas être liée à la formation **%s**. Je suis ici pour vous aider uniquement sur les thèmes liés à **%s**. Posez-moi une question sur ce sujet !"
            - ENGLISH: "This image/question/document does not seem to be related to the training **%s**. I am here to help you only with topics related to **%s**. Ask me a question about this subject!"
            - ARABIC: "هذه الصورة/السؤال/المستند لا يبدو مرتبطًا بالتكوين **%s**. أنا هنا لمساعدتك فقط في المواضيع المتعلقة بـ **%s**. اطرح سؤالاً حول هذا الموضوع!"
            
            === CRITICAL LANGUAGE RULE ===
            Reply in the SAME language as the user.
            
            === FORMAT ===
            - Be concise and pedagogical.
            - Use bullet points if helpful.
            - Stay strictly within the context of the training "%s".
            """,
                titre, categorie, niveau,
                titre, titre,
                titre, titre, titre, titre, titre, titre,
                titre
        );
    }
}
