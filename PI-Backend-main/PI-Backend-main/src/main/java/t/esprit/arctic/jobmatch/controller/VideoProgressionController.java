package t.esprit.arctic.jobmatch.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.entity.VideoProgression;
import t.esprit.arctic.jobmatch.repository.InscriptionFormationRepository;
import t.esprit.arctic.jobmatch.repository.VideoProgressionRepository;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/video-progression")
@RequiredArgsConstructor
public class VideoProgressionController {

    private final VideoProgressionRepository     videoProgressionRepo;
    private final InscriptionFormationRepository inscriptionRepo;
    private final t.esprit.arctic.jobmatch.repository.InscriptionParcoursRepository inscriptionParcoursRepo;
    private final t.esprit.arctic.jobmatch.service.CertificatService certificatService;
    private final t.esprit.arctic.jobmatch.service.NotificationService notificationService;


    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient   http   = HttpClient.newHttpClient();

    @Value("${youtube.api.key:}")
    private String youtubeApiKey;

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @PostMapping("/video-vue")
    public ResponseEntity<Map<String, Object>> marquerVideoVue(
            @RequestBody Map<String, Object> body) {

        Long   inscriptionId = Long.valueOf(body.get("inscriptionId").toString());
        Long   candidatId    = Long.valueOf(body.get("candidatId").toString());
        Long   formationId   = Long.valueOf(body.get("formationId").toString());
        String videoId       = body.get("videoId").toString();
        int    totalVideos   = Integer.parseInt(
                body.getOrDefault("totalVideos", "1").toString());

        Optional<VideoProgression> existing =
                videoProgressionRepo.findByInscriptionIdAndVideoId(
                        inscriptionId, videoId);

        VideoProgression vp = existing.orElse(new VideoProgression());
        vp.setInscriptionId(inscriptionId);
        vp.setCandidatId(candidatId);
        vp.setFormationId(formationId);
        vp.setVideoId(videoId);
        vp.setVuComplete(true);
        vp.setQuizReussi(true);
        vp.setScoreQuiz(100);
        vp.setDateVue(LocalDateTime.now());
        videoProgressionRepo.save(vp);

        int progression = calculerProgression(inscriptionId, formationId, totalVideos);
        mettreAJourInscription(inscriptionId, progression);

        // Si progression 100% au niveau EXPERT, on active l'exigence de macro-feedback
        if (progression >= 100) {
            inscriptionRepo.findById(inscriptionId).ifPresent(ins -> {
                if (ins.getCandidat() != null) {
                    inscriptionParcoursRepo.findByCandidatId(ins.getCandidat().getId()).stream()
                            .filter(ip -> "EXPERT".equals(ip.getNiveauActuel().toString()) && ip.getParcours().getNiveauExpert() != null && ip.getParcours().getNiveauExpert().getId().equals(formationId))
                            .findFirst()
                            .ifPresent(ip -> {
                                if (!"TERMINE".equals(ip.getStatut())) {
                                    ip.setStatut("TERMINE");
                                    ip.setEvaluationParcoursRequise(true);
                                    inscriptionParcoursRepo.save(ip);
                                    
                                    // Envoyer la notification de succès
                                    try {
                                        notificationService.notifyParcoursCompletion(
                                            ins.getCandidat().getId(), 
                                            ip.getParcours().getTitre(), 
                                            ip.getParcours().getId()
                                        );
                                    } catch (Exception e) {
                                        System.err.println("❌ Erreur notification fin parcours via progression: " + e.getMessage());
                                    }
                                }
                            });
                }
            });
        }

        Map<String, Object> result = new HashMap<>();
        result.put("progression",      progression);
        result.put("videoId",          videoId);
        result.put("formationTerminee", progression >= 100);
        result.put("message",
                "Vidéo terminée ✅ Progression : " + progression + "%");
        return ResponseEntity.ok(result);
    }

    @GetMapping("/inscription/{inscriptionId}")
    public ResponseEntity<Map<String, Object>> getProgression(
            @PathVariable Long inscriptionId,
            @RequestParam(defaultValue = "1") int totalVideos) {

        List<VideoProgression> vps =
                videoProgressionRepo.findByInscriptionId(inscriptionId);

        // On vérifie d'abord si l'inscription est déjà marquée comme terminée en base
        Optional<t.esprit.arctic.jobmatch.entity.InscriptionFormation> insOpt = inscriptionRepo.findById(inscriptionId);
        int progressionInDb = insOpt.map(i -> i.getProgression() != null ? i.getProgression().intValue() : 0).orElse(0);
        String statutInDb = insOpt.map(i -> i.getStatut()).orElse("EnCours");

        int progression = ("Terminé".equalsIgnoreCase(statutInDb) || progressionInDb >= 100) ? 100 : -1;

        // Calcul réel basé sur les vidéos uniques de CETTE formation
        int progressionCalculee = calculerProgression(inscriptionId, insOpt.map(i -> i.getFormation().getId()).orElse(0L), totalVideos);

        // Si non terminée en base, on utilise le calcul
        if (progression == -1) {
            progression = progressionCalculee;
        }

        // SYNCHRONISATION : Si la base est à 0 (ou en retard) mais que le calcul donne plus, on met à jour la base
        if (progressionCalculee > progressionInDb && !"Terminé".equalsIgnoreCase(statutInDb)) {
            mettreAJourInscription(inscriptionId, progressionCalculee);
        }

        Map<String, Object> result = new HashMap<>();
        long distinctVues = videoProgressionRepo.countDistinctVideoIdByInscriptionIdAndVuCompleteTrue(inscriptionId);
        
        result.put("videosVues",  distinctVues);
        result.put("totalVideos", totalVideos);
        result.put("progression", progression);
        result.put("tentativesUtilisees", insOpt.map(i -> i.getTentativesQuizFinal() != null ? i.getTentativesQuizFinal() : 0).orElse(0));
        result.put("parcoursId", insOpt.map(i -> i.getParcoursId()).orElse(null));
        result.put("niveau", insOpt.map(i -> i.getNiveauContext()).orElse(null));
        result.put("details",     vps);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/quiz-final/generer")
    public ResponseEntity<Map<String, Object>> genererQuizFinal(
            @RequestBody Map<String, Object> body) throws Exception {

        Long   inscriptionId = body.get("inscriptionId") != null ? Long.valueOf(body.get("inscriptionId").toString()) : 0L;
        String titreFormation = Objects.toString(body.get("titreFormation"), "");
        String categorie     = Objects.toString(body.get("categorie"), "");
        String playlistId    = Objects.toString(body.get("playlistId"), "");
        String niveau        = Objects.toString(body.get("niveau"), "");

        int totalVideos = body.get("totalVideos") != null ? Integer.parseInt(body.get("totalVideos").toString()) : 1;
        
        Long formationId = inscriptionRepo.findById(inscriptionId)
                .map(ins -> ins.getFormation().getId()).orElse(0L);
        int progression = calculerProgression(inscriptionId, formationId, totalVideos);

        if (progression < 100) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Formation non terminée");
            err.put("progression", progression);
            return ResponseEntity.badRequest().body(err);
        }

        List<VideoProgression> vps =
                videoProgressionRepo.findByInscriptionId(inscriptionId);
        List<String> videoIds = vps.stream()
                .filter(VideoProgression::isVuComplete)
                .map(VideoProgression::getVideoId)
                .limit(10) // max 10 vidéos pour le contexte
                .toList();

        List<String> videoTitles = getVideoTitles(videoIds);

        List<Map<String, Object>> questions =
                genererQuizFinal(titreFormation, categorie, videoTitles, niveau);

        // Gestion des tentatives et vérification de la limite (3 tentatives max pour formation simple ou expert)
        int tentatives = 0;
        Optional<t.esprit.arctic.jobmatch.entity.InscriptionFormation> insOpt = inscriptionRepo.findById(inscriptionId);
        if (insOpt.isPresent()) {
            t.esprit.arctic.jobmatch.entity.InscriptionFormation ins = insOpt.get();
            tentatives = (ins.getTentativesQuizFinal() != null ? ins.getTentativesQuizFinal() : 0) + 1;
            
            boolean isExpert = "EXPERT".equalsIgnoreCase(ins.getNiveauContext());
            boolean isParcours = ins.getParcoursId() != null;

            if (!isParcours || isExpert) {
                if (tentatives > 3) {
                    Map<String, Object> err = new HashMap<>();
                    err.put("error", "Nombre maximum de tentatives (3) atteint pour ce quiz.");
                    return ResponseEntity.badRequest().body(err);
                }
            }
            
            ins.setTentativesQuizFinal(tentatives);
            inscriptionRepo.save(ins);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("questions",    questions);
        result.put("inscriptionId", inscriptionId);
        result.put("niveau",       niveau);
        result.put("scoreMinimum", "EXPERT".equals(niveau) ? 80 : 70); 
        result.put("tentativesUtilisees", tentatives);
        return ResponseEntity.ok(result);
    }


    @PostMapping("/quiz-final/soumettre")
    public ResponseEntity<Map<String, Object>> soumettreQuizFinal(
            @RequestBody Map<String, Object> body) {

        Long inscriptionId = body.get("inscriptionId") != null ? Long.valueOf(body.get("inscriptionId").toString()) : 0L;
        int  score         = body.get("score") != null ? Integer.parseInt(body.get("score").toString()) : 0;
        
        // Sécurité sur le champ niveau pour éviter le NPE
        String niveauStr = body.get("niveau") != null ? body.get("niveau").toString() : "";
        Long parcoursId = body.get("parcoursId") != null ? Long.valueOf(body.get("parcoursId").toString()) : null;

        boolean reussi = score >= (("EXPERT".equals(niveauStr)) ? 80 : 70);

        Map<String, Object> result = new HashMap<>();
        result.put("score",  score);
        result.put("reussi", reussi);

        if (reussi) {
            try {
                // 1. Validation de l'inscription individuelle
                inscriptionRepo.findById(inscriptionId).ifPresent(ins -> {
                    ins.setStatut("Terminé");
                    ins.setProgression(100.0);
                    inscriptionRepo.save(ins);

                    // 2. Si c'est un parcours et niveau EXPERT, validation du parcours
                    // On tente de récupérer le parcoursId s'il est manquant
                    final Long finalParcoursId = (parcoursId != null) ? parcoursId : 
                        inscriptionParcoursRepo.findByCandidatId(ins.getCandidat().getId()).stream()
                            .filter(ip -> ip.getParcours().getNiveauExpert() != null && ip.getParcours().getNiveauExpert().getId().equals(ins.getFormation().getId()))
                            .map(ip -> ip.getParcours().getId())
                            .findFirst().orElse(null);

                    if (finalParcoursId != null && "EXPERT".equalsIgnoreCase(niveauStr) && ins.getCandidat() != null) {
                        inscriptionParcoursRepo.findByCandidatIdAndParcoursId(ins.getCandidat().getId(), finalParcoursId)
                                .ifPresent(ip -> {
                                    if (!"TERMINE".equals(ip.getStatut())) {
                                        ip.setStatut("TERMINE");
                                        ip.setEvaluationParcoursRequise(true);
                                        inscriptionParcoursRepo.save(ip);
                                        System.out.println("🏆 Parcours " + finalParcoursId + " terminé avec succès !");
                                        
                                        // 3. Notification de fin de parcours
                                        notificationService.notifyParcoursCompletion(
                                            ins.getCandidat().getId(), 
                                            ip.getParcours().getTitre(), 
                                            finalParcoursId
                                        );

                                        // 4. On ne génère plus le certificat ici, il sera généré après le macro-feedback
                                        System.out.println("🏁 Parcours " + finalParcoursId + " terminé. En attente de feedback pour le certificat.");
                                    }
                                });
                    }
                });
                
                result.put("certificatGenere", false); // Car il faut d'abord le feedback
                result.put("message",
                        "Félicitations ! Vous avez réussi avec " + score
                                + "%. Votre certificat sera disponible juste après avoir partagé votre avis sur le parcours !");
            } catch (Exception e) {
                result.put("certificatGenere", false);
                result.put("message", "Score validé mais erreur lors de la mise à jour.");
            }
        } else {
            result.put("certificatGenere", false);
            result.put("message",
                    "Score insuffisant (" + score
                            + "%). Il faut " + (parcoursId != null && "EXPERT".equals(niveauStr) ? "80" : "70") 
                            + "% minimum. Vous pouvez réessayer !");
        }
        return ResponseEntity.ok(result);
    }



    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> genererQuizFinal(
            String titreFormation,
            String categorie,
            List<String> videoTitles,
            String niveau) {

        if (geminiApiKey == null || geminiApiKey.isEmpty()) {
            return getQuizFinalFallback(titreFormation);
        }

        try {
            String listeVideos = videoTitles.isEmpty()
                    ? "Formation complète sur " + titreFormation
                    : String.join("\n- ", videoTitles);

            String prompt = """
                Tu es un formateur expert en %s.
                
                Le candidat vient de terminer la formation complète :
                "%s"
                Niveau ciblé : %s
                
                Voici les titres des vidéos qu'il a étudiées :
                - %s
                
                Génère exactement 10 questions QCM d'évaluation technique
                parfaitement adaptées au niveau %s.
                
                Règles :
                - Questions variées couvrant l'ensemble de la formation.
                - Difficulté : %s.
                - 4 options par question (A, B, C, D).
                - Une seule bonne réponse.
                - Questions techniques et concrètes (syntaxe, architecture, cas pratiques).
                - Inclure une explication détaillée pour la bonne réponse.
                
                Réponds UNIQUEMENT en JSON valide sans markdown ni backticks :
                [
                  {
                    "question": "Question technique précise ?",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correctIndex": 0,
                    "explication": "Explication de la bonne réponse",
                    "difficulte": "facile"
                  }
                ]
                """.formatted(categorie, titreFormation, niveau.isEmpty() ? "Standard" : niveau, 
                           listeVideos, niveau.isEmpty() ? "Intermédiaire" : niveau,
                           "EXPERT".equals(niveau) ? "Haut Niveau / Architecture" : "Progressive");

            String requestBody = mapper.writeValueAsString(Map.of(
                    "model", "llama-3.1-8b-instant",
                    "messages", List.of(Map.of(
                            "role", "user",
                            "content", prompt
                    )),
                    "temperature", 0.5,
                    "max_tokens", 4096
            ));

            String url = "https://api.groq.com/openai/v1/chat/completions";

            HttpResponse<String> response = http.send(
                    HttpRequest.newBuilder()
                            .uri(URI.create(url))
                            .header("Content-Type", "application/json")
                            .header("Authorization", "Bearer " + geminiApiKey)
                            .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                            .build(),
                    HttpResponse.BodyHandlers.ofString()
            );

            JsonNode root = mapper.readTree(response.body());

            if (root.has("error")) {
                System.err.println("Groq API error: "
                        + root.path("error").path("message").asText());
                return getQuizFinalFallback(titreFormation);
            }

            String text = root.path("choices").get(0)
                    .path("message").path("content").asText("[]").trim();

            // Hardened JSON Extraction
            int start = text.indexOf('[');
            int end   = text.lastIndexOf(']');
            if (start >= 0 && end > start) {
                text = text.substring(start, end + 1);
            }

            // Nettoyer les éventuels backticks markdown
            text = text.replaceAll("(?s)```json\\s*", "")
                       .replaceAll("(?s)```\\s*", "").trim();

            List<Map<String, Object>> questions =
                    mapper.readValue(text, List.class);

            System.out.println("✅ Quiz final généré par l'IA: "
                    + questions.size() + " questions pour " + titreFormation);
            return questions;

        } catch (Exception e) {
            System.err.println("Erreur quiz final Gemini: " + e.getMessage());
            return getQuizFinalFallback(titreFormation);
        }
    }

    private List<String> getVideoTitles(List<String> videoIds) {
        if (videoIds.isEmpty()) return new ArrayList<>();
        if (youtubeApiKey == null || youtubeApiKey.isBlank()) {
            return new ArrayList<>();
        }
        try {
            String ids = String.join(",", videoIds);
            String url = "https://www.googleapis.com/youtube/v3/videos"
                    + "?part=snippet&id=" + ids
                    + "&key=" + youtubeApiKey;

            HttpResponse<String> response = http.send(
                    HttpRequest.newBuilder()
                            .uri(URI.create(url))
                            .header("Accept", "application/json")
                            .build(),
                    HttpResponse.BodyHandlers.ofString()
            );

            JsonNode root  = mapper.readTree(response.body());
            JsonNode items = root.path("items");

            List<String> titles = new ArrayList<>();
            for (JsonNode item : items) {
                String title = item.path("snippet").path("title").asText("");
                if (!title.isEmpty()) titles.add(title);
            }
            return titles;

        } catch (Exception e) {
            System.err.println("Erreur récup titres: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    private List<Map<String, Object>> getQuizFinalFallback(
            String titreFormation) {
        List<Map<String, Object>> questions = new ArrayList<>();

        Object[][] data = {
                {"Quel est l'objectif principal de la formation \"" + titreFormation + "\" ?",
                        new String[]{"Maîtriser les concepts fondamentaux",
                                "Obtenir un certificat uniquement",
                                "Regarder des vidéos",
                                "Aucune réponse"},
                        0, "La formation vise à maîtriser les concepts fondamentaux."},
                {"Quelle est la meilleure pratique après avoir terminé une formation ?",
                        new String[]{"Pratiquer immédiatement sur des projets réels",
                                "Attendre d'avoir tout mémorisé",
                                "Regarder d'autres formations",
                                "Ne rien faire"},
                        0, "La pratique immédiate consolide les apprentissages."},
                {"Comment évaluez-vous votre niveau après cette formation ?",
                        new String[]{"Je peux créer des projets de base",
                                "Je suis expert",
                                "Je n'ai rien appris",
                                "Je dois recommencer depuis zéro"},
                        0, "Une formation donne les bases pour créer des projets simples."}
        };

        for (Object[] d : data) {
            Map<String, Object> q = new HashMap<>();
            q.put("question",    d[0]);
            q.put("options",     Arrays.asList((String[]) d[1]));
            q.put("correctIndex", d[2]);
            q.put("explication", d[3]);
            q.put("difficulte",  "facile");
            questions.add(q);
        }
        return questions;
    }

    private int calculerProgression(Long inscriptionId, Long formationId, int totalVideos) {
        if (totalVideos <= 0) return 0;
        
        // Sécurité : on regarde d'abord le statut forcé
        Optional<t.esprit.arctic.jobmatch.entity.InscriptionFormation> insOpt = inscriptionRepo.findById(inscriptionId);
        if (insOpt.isPresent() && ("Terminé".equalsIgnoreCase(insOpt.get().getStatut()) || insOpt.get().getProgression() >= 100)) {
            return 100;
        }

        long videosVues = videoProgressionRepo
                .countDistinctVideoIdByInscriptionIdAndFormationIdAndVuCompleteTrue(inscriptionId, formationId);
        return (int) Math.min(100,
                Math.round((double) videosVues / totalVideos * 100));
    }

    private void mettreAJourInscription(Long inscriptionId, int progression) {
        inscriptionRepo.findById(inscriptionId).ifPresent(ins -> {
            // On ne revient jamais en arrière si c'est déjà terminé
            if ("Terminé".equalsIgnoreCase(ins.getStatut()) || ins.getProgression() >= 100) {
                return;
            }
            
            ins.setProgression((double) progression);
            if (progression > 0 && progression < 100) {
                ins.setStatut("EnCours");
            } else if (progression >= 100) {
                ins.setStatut("Terminé");
            }
            inscriptionRepo.save(ins);
        });
    }
}
