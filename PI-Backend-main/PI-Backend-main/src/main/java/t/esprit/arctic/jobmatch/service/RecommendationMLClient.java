package t.esprit.arctic.jobmatch.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import t.esprit.arctic.jobmatch.entity.Candidat;
import t.esprit.arctic.jobmatch.entity.Competence;
import t.esprit.arctic.jobmatch.entity.Formation;
import t.esprit.arctic.jobmatch.entity.InscriptionFormation;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class RecommendationMLClient {

    private final RestTemplate restTemplate;

    @Value("${formation.python.recommendation.url:http://127.0.0.1:5000/recommend}")
    private String mlServiceUrl;

    @Value("${ml.internal.api-key:}")
    private String mlInternalApiKey;

    public RecommendationMLClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public List<Map<String, Object>> getRecommendations(Candidat candidat, List<Formation> formationsDisponibles) {

        List<String> candidatCompetences = new ArrayList<>();
        if (candidat.getCompetences() != null) {
            candidatCompetences = candidat.getCompetences().stream()
                    .map(Competence::getNom)
                    .collect(Collectors.toList());
        }

        List<Long> formationsTermineesIds = new ArrayList<>();
        if (candidat.getInscriptions() != null) {
            formationsTermineesIds = candidat.getInscriptions().stream()
                    .filter(i -> "Terminé".equals(i.getStatut()) && i.getFormation() != null)
                    .map(i -> i.getFormation().getId())
                    .collect(Collectors.toList());
        }

        List<Map<String, Object>> formationsData = formationsDisponibles.stream().map(f -> {
            List<String> compNames = new ArrayList<>();
            if (f.getCompetences() != null) {
                compNames = f.getCompetences().stream().map(Competence::getNom).collect(Collectors.toList());
            }
            return Map.of(
                    "id", f.getId(),
                    "titre", f.getTitre() != null ? f.getTitre() : "",
                    "description", f.getDescription() != null ? f.getDescription() : "",
                    "categorie", f.getCategorie() != null ? f.getCategorie() : "",
                    "niveau", f.getNiveau() != null ? f.getNiveau() : "",
                    "competences", compNames
            );
        }).collect(Collectors.toList());

        Map<String, Object> requestBody = Map.of(
                "candidat_competences", candidatCompetences,
                "candidat_niveau", candidat.getNiveauEtude() != null ? candidat.getNiveauEtude() : "",
                "formations_terminees_ids", formationsTermineesIds,
                "formations_disponibles", formationsData
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (StringUtils.hasText(mlInternalApiKey)) {
            headers.set("X-Internal-Api-Key", mlInternalApiKey);
        }
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            List<?> response = restTemplate.postForObject(mlServiceUrl, entity, List.class);
            if (response == null) {
                return new ArrayList<>();
            }
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> cast = (List<Map<String, Object>>) response;
            return cast;
        } catch (Exception e) {
            System.err.println("Erreur de connexion au service ML Python : " + e.getMessage());
            return new ArrayList<>();
        }
    }
}
