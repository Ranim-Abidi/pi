package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import t.esprit.arctic.jobmatch.dto.*;
import t.esprit.arctic.jobmatch.entity.Candidat;
import t.esprit.arctic.jobmatch.entity.CandidateRecommendation;
import t.esprit.arctic.jobmatch.entity.OffreEmploi;
import t.esprit.arctic.jobmatch.repository.CandidateRecommendationRepository;
import t.esprit.arctic.jobmatch.repository.CandidatRepository;
import t.esprit.arctic.jobmatch.repository.OffreEmploiRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecommendationService {

    private final CandidateRecommendationRepository recommendationRepository;
    private final CandidatRepository candidatRepository;
    private final OffreEmploiRepository offreRepository;
    private final MatchingScoreCalculatorService scoreCalculator;
    private final RestTemplate restTemplate;

    @Value("${flask.recommendation.url:http://localhost:5000/api/recommend}")
    private String flaskRecommendationUrl;

    @Value("${flask.recommendation.enabled:false}")
    private boolean flaskEnabled;

    @Value("${ml.internal.api-key:}")
    private String mlInternalApiKey;

    /**
     * Generate recommendations for a candidate against a specific job offer
     */
    @Transactional
    public CandidateRecommendationDTO recommendCandidateForOffre(Long candidatId, Long offreId) {
        Candidat candidat = candidatRepository.findById(candidatId)
                .orElseThrow(() -> new RuntimeException("Candidat not found: " + candidatId));
        
        OffreEmploi offre = offreRepository.findById(offreId)
                .orElseThrow(() -> new RuntimeException("Offre not found: " + offreId));

        return generateRecommendation(candidat, offre);
    }

    /**
     * Generate top N recommendations for a job offer
     */
    @Transactional(readOnly = true)
    public List<CandidateRecommendationDTO> getTopCandidatesForOffre(Long offreId, int limit) {
        return recommendationRepository.findTopCandidatesForOffre(offreId).stream()
                .limit(limit)
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get recommended job offers for a candidate
     */
    @Transactional(readOnly = true)
    public List<CandidateRecommendationDTO> getRecommendedOffresForCandidat(Long candidatId, int limit) {
        return recommendationRepository.findRecommendedOffresForCandidat(candidatId).stream()
                .limit(limit)
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get recommendations for an offre filtered by recommendation level
     */
    @Transactional(readOnly = true)
    public List<CandidateRecommendationDTO> getCandidatesByRecommendationLevel(
            Long offreId, String level, int limit) {
        return recommendationRepository.findByOffreAndRecommendationLevel(offreId, level).stream()
                .limit(limit)
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Batch generate recommendations for all candidates for a specific job
     */
    @Transactional
    public List<CandidateRecommendationDTO> generateRecommendationsForOffre(Long offreId) {
        OffreEmploi offre = offreRepository.findById(offreId)
                .orElseThrow(() -> new RuntimeException("Offre not found: " + offreId));

        List<Candidat> allCandidates = candidatRepository.findAll();
        
        return allCandidates.stream()
                .map(candidat -> generateRecommendation(candidat, offre))
                .collect(Collectors.toList());
    }

    /**
     * Batch generate recommendations for all offres for a specific candidate
     */
    @Transactional
    public List<CandidateRecommendationDTO> generateRecommendationsForCandidat(Long candidatId) {
        Candidat candidat = candidatRepository.findById(candidatId)
                .orElseThrow(() -> new RuntimeException("Candidat not found: " + candidatId));

        List<OffreEmploi> allOffres = offreRepository.findAll();
        
        return allOffres.stream()
                .map(offre -> generateRecommendation(candidat, offre))
                .collect(Collectors.toList());
    }

    /**
     * Core recommendation generation logic
     */
    @Transactional
    private CandidateRecommendationDTO generateRecommendation(Candidat candidat, OffreEmploi offre) {
        try {
            // Calculate matching scores
            MatchingScoresDTO scores = scoreCalculator.calculateMatchingScores(candidat, offre);

            // Call Flask API for predictions
            RecommendationResponse flaskResponse = callFlaskPrediction(scores);

            // Create or update recommendation record
            CandidateRecommendation recommendation = recommendationRepository
                    .findByOffreAndCandidat(offre, candidat)
                    .orElse(new CandidateRecommendation());

            recommendation.setOffre(offre);
            recommendation.setCandidat(candidat);
            recommendation.setSSkills(scores.getSSkills());
            recommendation.setSExperience(scores.getSExperience());
            recommendation.setSLocation(scores.getSLocation());
            recommendation.setSDomain(scores.getSDomain());
            recommendation.setScoreglobal(flaskResponse.getScoreglobal());
            recommendation.setRecommendationLevel(flaskResponse.getMultiClassClassification());
            recommendation.setBinaryClassification(flaskResponse.getBinaryClassification());
            recommendation.setUpdatedAt(LocalDateTime.now());

            // match_details is optional - the important data is stored in individual score columns
            // Set to null to avoid JSON constraint issues
            recommendation.setMatchDetails(null);

            recommendationRepository.save(recommendation);

            return toDTO(recommendation);

        } catch (Exception e) {
            log.error("Error generating recommendation for candidate {} and offre {}", 
                candidat.getId(), offre.getId(), e);
            throw new RuntimeException("Failed to generate recommendation: " + e.getMessage());
        }
    }

    /**
     * Call Flask API for prediction
     */
    private RecommendationResponse callFlaskPrediction(MatchingScoresDTO scores) {
        if (!flaskEnabled) {
            log.warn("Flask prediction disabled, using default classification");
            return createDefaultResponse(scores);
        }

        try {
            RecommendationRequest request = RecommendationRequest.builder()
                    .s_skills(scores.getSSkills())
                    .s_experience(scores.getSExperience())
                    .s_location(scores.getSLocation())
                    .s_domain(scores.getSDomain())
                    .build();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (StringUtils.hasText(mlInternalApiKey)) {
                headers.set("X-Internal-Api-Key", mlInternalApiKey);
            }

            HttpEntity<RecommendationRequest> entity = new HttpEntity<>(request, headers);

            ResponseEntity<RecommendationResponse> response = restTemplate.postForEntity(
                    flaskRecommendationUrl,
                    entity,
                    RecommendationResponse.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            } else {
                log.error("Flask API returned error status: {}", response.getStatusCode());
                return createDefaultResponse(scores);
            }

        } catch (Exception e) {
            log.error("Error calling Flask API: {}", e.getMessage());
            return createDefaultResponse(scores);
        }
    }

    /**
     * Create default response when Flask is unavailable
     */
    private RecommendationResponse createDefaultResponse(MatchingScoresDTO scores) {
        // Simple scoring: average of all scores * 100
        double avgScore = (scores.getSSkills() + scores.getSExperience() + 
                          scores.getSLocation() + scores.getSDomain()) / 4.0 * 100;

        String multiClass;
        if (avgScore >= 80) {
            multiClass = "Très recommandé";
        } else if (avgScore >= 60) {
            multiClass = "Recommandé";
        } else if (avgScore >= 40) {
            multiClass = "Moyen";
        } else {
            multiClass = "Faible match";
        }

        String binary = avgScore >= 60 ? "Bon candidat" : "Mauvais candidat";

        return RecommendationResponse.builder()
                .scoreglobal(avgScore)
                .multiClassClassification(multiClass)
                .binaryClassification(binary)
                .build();
    }

    /**
     * Convert entity to DTO
     */
    private CandidateRecommendationDTO toDTO(CandidateRecommendation recommendation) {
        return CandidateRecommendationDTO.builder()
                .id(recommendation.getId())
                .candidatId(recommendation.getCandidat().getId())
                .candidatNom(recommendation.getCandidat().getPrenom() + " " + recommendation.getCandidat().getNom())
                .offreId(recommendation.getOffre().getId())
                .offreTitre(recommendation.getOffre().getTitre())
                .sSkills(recommendation.getSSkills())
                .sExperience(recommendation.getSExperience())
                .sLocation(recommendation.getSLocation())
                .sDomain(recommendation.getSDomain())
                .scoreglobal(recommendation.getScoreglobal())
                .recommendationLevel(recommendation.getRecommendationLevel())
                .binaryClassification(recommendation.getBinaryClassification())
                .createdAt(recommendation.getCreatedAt().toString())
                .matchDetails(recommendation.getMatchDetails())
                .build();
    }
}
