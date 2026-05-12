// src/main/java/t/esprit/arctic/jobmatch/service/MLOptimizationService.java
package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import t.esprit.arctic.jobmatch.entity.Document;
import t.esprit.arctic.jobmatch.repository.DocumentRepository;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class MLOptimizationService {

    private final RestTemplate restTemplate;
    private final DocumentRepository documentRepository;

    @Value("${ml.service.url:http://localhost:8000}")
    private String mlServiceUrl;

    public Map<String, Object> optimiserCV(Long documentId, String offreEmploi) {
        try {
            Document document = documentRepository.findById(documentId)
                    .orElseThrow(() -> new RuntimeException("Document non trouvé"));

            String cvContent = extraireTextePropre(document.getContenu());

            Map<String, String> request = new HashMap<>();
            request.put("cv_content", cvContent);
            request.put("job_offer", offreEmploi);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> entity = new HttpEntity<>(request, headers);

            log.info("📡 Appel du service ML...");

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    mlServiceUrl + "/optimize",
                    entity,
                    Map.class
            );

            return response.getBody();

        } catch (Exception e) {
            log.error("❌ Erreur appel service ML: {}", e.getMessage());
            return genererFallback(offreEmploi);
        }
    }

    private String extraireTextePropre(String html) {
        if (html == null) return "";
        return html.replaceAll("<[^>]+>", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private Map<String, Object> genererFallback(String offreEmploi) {
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("scoreCompatibilite", 50);
        fallback.put("probabiliteEntretien", 45);
        fallback.put("competencesCorrespondantes", List.of("Service ML indisponible"));
        fallback.put("competencesManquantes", List.of("Démarrez le service Python: python main.py"));
        fallback.put("suggestionsOptimisation", List.of("Vérifiez que le service ML tourne sur le port 8000"));
        fallback.put("phrasesAjouter", List.of("Service ML non disponible"));
        return fallback;
    }
}