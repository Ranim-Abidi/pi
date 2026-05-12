package t.esprit.arctic.jobmatch.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import t.esprit.arctic.jobmatch.entity.Document;
import t.esprit.arctic.jobmatch.repository.DocumentRepository;

import java.util.*;

@RestController
@RequestMapping("/api/cv-analyse")
@RequiredArgsConstructor
@Slf4j
public class CvAnalyseController {

    private final DocumentRepository documentRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    private static final String ML_SERVICE_URL = "http://localhost:8000";

    @PostMapping("/analyser/{documentId}")
    public ResponseEntity<Map<String, Object>> analyserCV(@PathVariable Long documentId) {
        try {
            log.info("🔍 Analyse du CV ID: {}", documentId);

            Optional<Document> docOpt = documentRepository.findById(documentId);
            if (docOpt.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Document non trouvé"));
            }

            Document document = docOpt.get();

            if (!"CV".equals(document.getType().toString())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Ce document n'est pas un CV"));
            }

            String contenuHTML = document.getContenu();
            String texteCV = extraireTextePropre(contenuHTML);

            log.info("📝 Texte extrait: {} caractères", texteCV.length());

            if (texteCV == null || texteCV.trim().length() < 50) {
                log.warn("⚠️ CV trop court: {} caractères", texteCV != null ? texteCV.length() : 0);
                return ResponseEntity.ok(genererReponseCvVide());
            }

            // ✅ ESSAYER D'APPELER LE SERVICE ML
            Map<String, Object> analyse = appelerServiceMLPourAnalyse(texteCV);

            // Si le service ML a retourné une erreur ou des valeurs par défaut
            if (analyse == null || analyse.containsKey("error")) {
                log.warn("⚠️ Service ML indisponible, utilisation du fallback local");
                analyse = genererAnalyseLocale(texteCV);
            }

            return ResponseEntity.ok(analyse);

        } catch (Exception e) {
            log.error("❌ Erreur analyse CV", e);
            return ResponseEntity.ok(genererAnalyseLocale(extraireTextePropre(
                    documentRepository.findById(documentId).orElse(new Document()).getContenu()
            )));
        }
    }

    @PostMapping("/optimiser/{documentId}")
    public ResponseEntity<Map<String, Object>> optimiserCV(
            @PathVariable Long documentId,
            @RequestBody Map<String, String> body) {

        try {
            log.info("🚀 Optimisation du CV ID: {}", documentId);

            Document document = documentRepository.findById(documentId)
                    .orElseThrow(() -> new RuntimeException("Document non trouvé"));

            String contenuHTML = document.getContenu();
            String texteCV = extraireTextePropre(contenuHTML);
            String offreEmploi = body.getOrDefault("offreEmploi", "");

            if (offreEmploi.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Offre d'emploi requise"));
            }

            // ✅ ESSAYER D'APPELER LE SERVICE ML
            Map<String, Object> optimisation = appelerServiceMLPourOptimisation(texteCV, offreEmploi);

            if (optimisation == null || optimisation.containsKey("error")) {
                log.warn("⚠️ Service ML indisponible pour optimisation, utilisation du fallback");
                optimisation = genererOptimisationLocale(texteCV, offreEmploi);
            }

            return ResponseEntity.ok(optimisation);

        } catch (Exception e) {
            log.error("❌ Erreur optimisation", e);
            return ResponseEntity.ok(genererOptimisationLocale("", ""));
        }
    }

    /**
     * Appel au service ML pour l'analyse
     */
    private Map<String, Object> appelerServiceMLPourAnalyse(String cvContent) {
        try {
            String url = ML_SERVICE_URL + "/analyze";
            log.info("📡 Appel du service ML: {}", url);

            Map<String, String> request = new HashMap<>();
            request.put("cv_content", cvContent);

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);

            org.springframework.http.HttpEntity<Map<String, String>> entity =
                    new org.springframework.http.HttpEntity<>(request, headers);

            org.springframework.http.ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            log.info("✅ Réponse du service ML reçue (statut: {})", response.getStatusCode());
            return response.getBody();

        } catch (Exception e) {
            log.error("❌ Erreur appel service ML: {}", e.getMessage());
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Service ML indisponible: " + e.getMessage());
            return error;
        }
    }

    /**
     * Appel au service ML pour l'optimisation
     */
    private Map<String, Object> appelerServiceMLPourOptimisation(String cvContent, String offreEmploi) {
        try {
            String url = ML_SERVICE_URL + "/optimize";
            log.info("📡 Appel du service ML: {}", url);

            Map<String, String> request = new HashMap<>();
            request.put("cv_content", cvContent);
            request.put("job_offer", offreEmploi);

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);

            org.springframework.http.HttpEntity<Map<String, String>> entity =
                    new org.springframework.http.HttpEntity<>(request, headers);

            org.springframework.http.ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            log.info("✅ Réponse du service ML reçue (statut: {})", response.getStatusCode());
            return response.getBody();

        } catch (Exception e) {
            log.error("❌ Erreur appel service ML: {}", e.getMessage());
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Service ML indisponible: " + e.getMessage());
            return error;
        }
    }

    /**
     * Analyse locale basée sur le contenu réel (fallback si ML indisponible)
     */
    private Map<String, Object> genererAnalyseLocale(String texteCV) {
        log.info("📊 Génération analyse locale pour CV de {} caractères", texteCV.length());

        Map<String, Object> result = new HashMap<>();

        if (texteCV == null || texteCV.isEmpty()) {
            texteCV = "";
        }

        String cvLower = texteCV.toLowerCase();

        // Calcul dynamique des scores basé sur le contenu réel
        int scoreCompetences = 30;
        String[] comps = {"java", "python", "angular", "spring", "autocad", "revit", "sql", "docker", "javascript", "react", "php", "html", "css"};
        for (String comp : comps) {
            if (cvLower.contains(comp)) {
                scoreCompetences += 8;
                log.debug("Compétence trouvée: {}", comp);
            }
        }
        scoreCompetences = Math.min(scoreCompetences, 95);

        int scoreExperience = 30;
        if (cvLower.contains("expérience") || cvLower.contains("experience")) scoreExperience += 15;
        if (cvLower.contains("responsable")) scoreExperience += 10;
        if (cvLower.contains("gestion")) scoreExperience += 8;
        if (cvLower.contains("projet")) scoreExperience += 8;
        if (cvLower.matches(".*\\d+\\s*ans.*")) scoreExperience += 10;
        scoreExperience = Math.min(scoreExperience, 95);

        int scorePresentation = 60;
        if (texteCV.contains("<h1>")) scorePresentation += 10;
        if (texteCV.contains("<h2>")) scorePresentation += 10;
        if (texteCV.contains("<ul>")) scorePresentation += 5;
        scorePresentation = Math.min(scorePresentation, 95);

        int scoreFormation = 40;
        String[] formations = {"master", "licence", "bachelor", "diplôme", "université", "école", "ingénieur", "bac+5", "bac+3", "bts", "dut"};
        for (String f : formations) {
            if (cvLower.contains(f)) scoreFormation += 10;
        }
        scoreFormation = Math.min(scoreFormation, 95);

        int scoreGlobal = (scorePresentation + scoreCompetences + scoreExperience + scoreFormation) / 4;

        log.info("Scores calculés - Global: {}, Compétences: {}, Expérience: {}", scoreGlobal, scoreCompetences, scoreExperience);

        // Points forts
        List<String> pointsForts = new ArrayList<>();
        if (scorePresentation > 70) pointsForts.add("✅ Structure claire et professionnelle");
        if (scoreExperience > 70) pointsForts.add("✅ Expériences bien détaillées");
        if (scoreCompetences > 70) pointsForts.add("✅ Bonne variété de compétences");
        if (pointsForts.isEmpty()) pointsForts.add("✅ Structure de base correcte");

        // Points à améliorer
        List<String> pointsAmeliorer = new ArrayList<>();
        if (!cvLower.matches(".*\\d+.*") && !cvLower.contains("%")) {
            pointsAmeliorer.add("📊 Ajoutez des résultats chiffrés (ex: +30% de ventes)");
        }
        if (scoreCompetences < 60) {
            pointsAmeliorer.add("🔑 Ajoutez plus de compétences techniques spécifiques");
        }
        if (scoreExperience < 60) {
            pointsAmeliorer.add("💼 Détaillez mieux vos expériences professionnelles");
        }
        if (texteCV.length() < 800) {
            pointsAmeliorer.add("📝 Développez davantage votre contenu");
        }

        // Mots-clés manquants
        List<String> motsClesManquants = new ArrayList<>();
        String[] motsImportants = {"leadership", "innovation", "autonomie", "créativité", "communication"};
        for (String mot : motsImportants) {
            if (!cvLower.contains(mot)) {
                motsClesManquants.add(mot);
            }
        }

        String resume;
        if (scoreGlobal >= 80) resume = "🏆 Excellent CV !";
        else if (scoreGlobal >= 65) resume = "👍 Bon CV, quelques améliorations possibles.";
        else if (scoreGlobal >= 50) resume = "📝 CV correct mais peut être nettement amélioré.";
        else resume = "⚠️ CV à améliorer significativement.";

        result.put("scoreGlobal", scoreGlobal);
        result.put("scorePresentation", scorePresentation);
        result.put("scoreCompetences", scoreCompetences);
        result.put("scoreExperience", scoreExperience);
        result.put("scoreFormation", scoreFormation);
        result.put("resumeAnalyse", resume);
        result.put("pointsForts", pointsForts);
        result.put("pointsAmeliorer", pointsAmeliorer);
        result.put("compatibleATS", scoreGlobal >= 60);
        result.put("conseilsATS", Arrays.asList(
                "🤖 Utilisez des titres standards (Expérience, Formation, Compétences)",
                "📄 Sauvegarde ton CV en PDF pour les ATS",
                "🔑 Intègre naturellement les mots-clés de l'offre d'emploi"
        ));
        result.put("motsClesManquants", motsClesManquants);

        return result;
    }

    private Map<String, Object> genererOptimisationLocale(String cvContent, String offreEmploi) {
        Map<String, Object> result = new HashMap<>();

        String cvLower = cvContent != null ? cvContent.toLowerCase() : "";
        String offreLower = offreEmploi != null ? offreEmploi.toLowerCase() : "";

        Set<String> cvMots = new HashSet<>(Arrays.asList(cvLower.split("\\s+")));
        Set<String> offreMots = new HashSet<>(Arrays.asList(offreLower.split("\\s+")));

        Set<String> communs = new HashSet<>(cvMots);
        communs.retainAll(offreMots);

        int score = offreMots.isEmpty() ? 0 : Math.min(40 + (communs.size() * 3), 98);

        result.put("scoreCompatibilite", score);
        result.put("probabiliteEntretien", Math.min(score + 10, 95));
        result.put("competencesCorrespondantes", communs.isEmpty() ?
                Arrays.asList("Compétences de base") : new ArrayList<>(communs).subList(0, Math.min(3, communs.size())));
        result.put("competencesManquantes", Arrays.asList("Personnalisez selon l'offre"));
        result.put("suggestionsOptimisation", Arrays.asList(
                "📌 Ajoutez les mots-clés techniques de l'offre",
                "🎯 Adaptez votre titre professionnel",
                "📊 Quantifiez vos réalisations"
        ));
        result.put("phrasesAjouter", Arrays.asList(
                "💡 Expérience pertinente dans le domaine",
                "🤝 Capacité à travailler en équipe"
        ));

        return result;
    }

    private Map<String, Object> genererReponseCvVide() {
        Map<String, Object> result = new HashMap<>();
        result.put("scoreGlobal", 0);
        result.put("scorePresentation", 0);
        result.put("scoreCompetences", 0);
        result.put("scoreExperience", 0);
        result.put("scoreFormation", 0);
        result.put("resumeAnalyse", "⚠️ CV VIDE ! Veuillez créer un CV avec vos informations.");
        result.put("pointsForts", Arrays.asList("❌ Aucun contenu détecté"));
        result.put("pointsAmeliorer", Arrays.asList(
                "📝 Créez un CV avec vos informations",
                "✏️ Remplissez les sections",
                "💾 Sauvegardez votre CV"
        ));
        result.put("compatibleATS", false);
        result.put("conseilsATS", Arrays.asList("Créez un CV valide"));
        result.put("motsClesManquants", Arrays.asList("CV vide"));
        return result;
    }

    private String extraireTextePropre(String html) {
        if (html == null) return "";
        return html.replaceAll("<[^>]+>", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }
}
