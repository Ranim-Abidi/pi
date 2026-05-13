package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import t.esprit.arctic.jobmatch.repository.DocumentRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class MLOptimizationService {

    private final DocumentRepository documentRepository;

    public Map<String, Object> optimiserCV(Long documentId, String offreEmploi) {
        try {
            documentRepository.findById(documentId)
                    .orElseThrow(() -> new RuntimeException("Document non trouvé"));
        } catch (Exception e) {
            log.warn("optimiserCV: {}", e.getMessage());
        }
        return genererFallback(offreEmploi);
    }

    private Map<String, Object> genererFallback(String offreEmploi) {
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("scoreCompatibilite", 50);
        fallback.put("probabiliteEntretien", 45);
        fallback.put("competencesCorrespondantes", List.of("Optimisation ML désactivée (déploiement slim)"));
        fallback.put("competencesManquantes", List.of());
        fallback.put("suggestionsOptimisation", List.of("Aucun appel HTTP vers le service Python"));
        fallback.put("phrasesAjouter", List.of());
        fallback.put("offre", offreEmploi != null ? offreEmploi : "");
        return fallback;
    }
}
