package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import t.esprit.arctic.jobmatch.dto.OffreRecommandeeDTO;
import t.esprit.arctic.jobmatch.entity.OffreEmploi;
import t.esprit.arctic.jobmatch.repository.OffreEmploiRepository;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class JobMatchingService {

    private final OffreEmploiRepository offreEmploiRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ml.service.url:http://localhost:8000}")
    private String mlServiceUrl;

    /**
     * Obtient les offres recommandées pour un candidat
     * @param competences Compétences du candidat (ex: "python java react")
     * @param userId Email ou ID de l'utilisateur (null si non authentifié)
     */
    public List<OffreRecommandeeDTO> getRecommendations(String competences, String userId) {

        // 1. Récupérer les offres ACTIVES des recruteurs (depuis la BDD)
        List<OffreEmploi> recruiterOffers = offreEmploiRepository.findByStatut("ACTIVE");
        System.out.println("📋 Offres recruteurs trouvées: " + recruiterOffers.size());

        // 2. Convertir les offres recruteurs au format attendu par le ML
        List<Map<String, Object>> recruiterOffersForML = recruiterOffers.stream()
                .map(this::convertToMLFormat)
                .collect(Collectors.toList());

        // 3. Préparer la requête vers le service ML
        Map<String, Object> request = new HashMap<>();
        request.put("candidate_skills", competences);
        request.put("candidate_experience", 0);
        request.put("top_n", 20);
        request.put("user_id", userId);
        request.put("db_offres", recruiterOffersForML);

        try {
            // 4. Appeler le service ML
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            String mlEndpoint = mlServiceUrl + "/matching/offres";
            ResponseEntity<Map> response = restTemplate.exchange(
                    mlEndpoint,
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            // 5. Traiter la réponse du ML
            if (response.getBody() != null && response.getBody().containsKey("offres")) {
                List<Map<String, Object>> mlOffres = (List<Map<String, Object>>) response.getBody().get("offres");
                return mlOffres.stream()
                        .map(this::convertFromMLFormat)
                        .collect(Collectors.toList());
            }

        } catch (Exception e) {
            System.err.println("❌ Erreur appel service ML: " + e.getMessage());
            // Fallback: retourner les offres recruteurs sans scoring ML
            return convertToFallbackOffers(recruiterOffers, competences);
        }

        return new ArrayList<>();
    }

    /**
     * Convertit une offre recruteur au format attendu par le ML
     */
    private Map<String, Object> convertToMLFormat(OffreEmploi offre) {
        Map<String, Object> mlOffer = new HashMap<>();
        mlOffer.put("job_id", String.valueOf(offre.getId()));
        mlOffer.put("job_title", offre.getTitre());
        mlOffer.put("job_domain", detectDomain(offre));
        mlOffer.put("job_skills", String.join(" ", offre.getCompetencesRequises()).toLowerCase());
        mlOffer.put("job_location", offre.getLocation());
        mlOffer.put("exp_required", 0);
        mlOffer.put("source", "recruiter");
        return mlOffer;
    }

    /**
     * Détecte le domaine d'une offre basé sur ses compétences
     */
    private String detectDomain(OffreEmploi offre) {
        String allSkills = String.join(" ", offre.getCompetencesRequises()).toLowerCase();

        if (allSkills.contains("python") || allSkills.contains("java") ||
                allSkills.contains("javascript") || allSkills.contains("react") ||
                allSkills.contains("spring") || allSkills.contains("sql")) {
            return "informatique";
        }
        if (allSkills.contains("infirmier") || allSkills.contains("soins") ||
                allSkills.contains("patient") || allSkills.contains("clinique")) {
            return "sante";
        }
        if (allSkills.contains("comptable") || allSkills.contains("finance") ||
                allSkills.contains("audit") || allSkills.contains("bilan")) {
            return "finance";
        }
        if (allSkills.contains("marketing") || allSkills.contains("seo") ||
                allSkills.contains("social") || allSkills.contains("community")) {
            return "marketing";
        }
        return "general";
    }

    /**
     * Convertit la réponse du ML en DTO
     */
    private OffreRecommandeeDTO convertFromMLFormat(Map<String, Object> mlOffer) {
        OffreRecommandeeDTO dto = new OffreRecommandeeDTO();
        dto.setJobId((String) mlOffer.get("job_id"));
        dto.setJobTitle((String) mlOffer.get("job_title"));
        dto.setJobDomain((String) mlOffer.get("job_domain"));
        dto.setJobLocation((String) mlOffer.getOrDefault("job_location", ""));
        dto.setJobSkills((String) mlOffer.getOrDefault("job_skills", ""));
        dto.setScoreMatch(((Number) mlOffer.get("score_match")).doubleValue());
        dto.setSource((String) mlOffer.getOrDefault("source", "unknown"));
        dto.setRaison((String) mlOffer.getOrDefault("raison", ""));
        return dto;
    }

    /**
     * Fallback si le ML n'est pas disponible
     */
    private List<OffreRecommandeeDTO> convertToFallbackOffers(List<OffreEmploi> offres, String competences) {
        List<OffreRecommandeeDTO> fallback = new ArrayList<>();
        String[] candidateSkills = competences.toLowerCase().split("\\s+");
        Set<String> candidateSet = new HashSet<>(Arrays.asList(candidateSkills));

        for (OffreEmploi offre : offres) {
            Set<String> jobSkills = new HashSet<>();
            for (String skill : offre.getCompetencesRequises()) {
                jobSkills.add(skill.toLowerCase());
            }

            // Compétences communes
            Set<String> common = new HashSet<>(jobSkills);
            common.retainAll(candidateSet);
            double score = (common.size() / (double) Math.max(offre.getCompetencesRequises().size(), 1)) * 100;

            OffreRecommandeeDTO dto = new OffreRecommandeeDTO();
            dto.setJobId(String.valueOf(offre.getId()));
            dto.setJobTitle(offre.getTitre());
            dto.setJobDomain(detectDomain(offre));
            dto.setJobLocation(offre.getLocation());
            dto.setJobSkills(String.join(", ", offre.getCompetencesRequises()));
            dto.setScoreMatch(score);
            dto.setSource("recruiter");
            dto.setRaison(common.size() + " compétence(s) commune(s)");
            fallback.add(dto);
        }

        fallback.sort((a, b) -> Double.compare(b.getScoreMatch(), a.getScoreMatch()));
        return fallback.stream().limit(10).collect(Collectors.toList());
    }
}