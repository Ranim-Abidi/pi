package t.esprit.arctic.jobmatch.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.dto.CandidateRecommendationDTO;
import t.esprit.arctic.jobmatch.service.RecommendationService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    /**
     * Get recommendation score for a specific candidate-offre pair
     * GET /api/recommendations/candidate/{candidatId}/offre/{offreId}
     */
    @GetMapping("/candidate/{candidatId}/offre/{offreId}")
    public ResponseEntity<CandidateRecommendationDTO> getRecommendation(
            @PathVariable Long candidatId,
            @PathVariable Long offreId) {
        try {
            CandidateRecommendationDTO recommendation = 
                recommendationService.recommendCandidateForOffre(candidatId, offreId);
            return ResponseEntity.ok(recommendation);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(null);
        }
    }

    /**
     * Get top candidates for a specific job offer
     * GET /api/recommendations/offre/{offreId}/top-candidates?limit=10
     */
    @GetMapping("/offre/{offreId}/top-candidates")
    public ResponseEntity<List<CandidateRecommendationDTO>> getTopCandidatesForOffre(
            @PathVariable Long offreId,
            @RequestParam(defaultValue = "10") int limit) {
        try {
            List<CandidateRecommendationDTO> recommendations = 
                recommendationService.getTopCandidatesForOffre(offreId, limit);
            return ResponseEntity.ok(recommendations);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(null);
        }
    }

    /**
     * Get recommended job offers for a candidate
     * GET /api/recommendations/candidate/{candidatId}/recommended-offres?limit=10
     */
    @GetMapping("/candidate/{candidatId}/recommended-offres")
    public ResponseEntity<List<CandidateRecommendationDTO>> getRecommendedOffresForCandidat(
            @PathVariable Long candidatId,
            @RequestParam(defaultValue = "10") int limit) {
        try {
            List<CandidateRecommendationDTO> recommendations = 
                recommendationService.getRecommendedOffresForCandidat(candidatId, limit);
            return ResponseEntity.ok(recommendations);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(null);
        }
    }

    /**
     * Get candidates by recommendation level for an offre
     * GET /api/recommendations/offre/{offreId}/level/{level}?limit=10
     * Levels: "Très recommandé", "Recommandé", "Moyen", "Faible match"
     */
    @GetMapping("/offre/{offreId}/level/{level}")
    public ResponseEntity<List<CandidateRecommendationDTO>> getCandidatesByLevel(
            @PathVariable Long offreId,
            @PathVariable String level,
            @RequestParam(defaultValue = "10") int limit) {
        try {
            List<CandidateRecommendationDTO> recommendations = 
                recommendationService.getCandidatesByRecommendationLevel(offreId, level, limit);
            return ResponseEntity.ok(recommendations);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(null);
        }
    }

    /**
     * Generate batch recommendations for all candidates for a job
     * POST /api/recommendations/batch/offre/{offreId}
     */
    @PostMapping("/batch/offre/{offreId}")
    public ResponseEntity<Map<String, Object>> generateRecommendationsForOffre(
            @PathVariable Long offreId) {
        try {
            List<CandidateRecommendationDTO> recommendations = 
                recommendationService.generateRecommendationsForOffre(offreId);
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "offreId", offreId,
                    "total", recommendations.size(),
                    "recommendations", recommendations
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(
                            "status", "error",
                            "message", e.getMessage()
                    ));
        }
    }

    /**
     * Generate batch recommendations for all job offers for a candidate
     * POST /api/recommendations/batch/candidate/{candidatId}
     */
    @PostMapping("/batch/candidate/{candidatId}")
    public ResponseEntity<Map<String, Object>> generateRecommendationsForCandidat(
            @PathVariable Long candidatId) {
        try {
            List<CandidateRecommendationDTO> recommendations = 
                recommendationService.generateRecommendationsForCandidat(candidatId);
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "candidatId", candidatId,
                    "total", recommendations.size(),
                    "recommendations", recommendations
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(
                            "status", "error",
                            "message", e.getMessage()
                    ));
        }
    }

    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "Recommendation service is running"));
    }
}
