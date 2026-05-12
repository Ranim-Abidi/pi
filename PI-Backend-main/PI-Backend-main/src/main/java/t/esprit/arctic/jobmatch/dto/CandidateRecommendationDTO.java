package t.esprit.arctic.jobmatch.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateRecommendationDTO {
    private Long id;
    private Long candidatId;
    private String candidatNom;
    private Long offreId;
    private String offreTitre;
    private Double sSkills;
    private Double sExperience;
    private Double sLocation;
    private Double sDomain;
    private Double scoreglobal;
    private String recommendationLevel;
    private String binaryClassification;
    private String createdAt;
    private String matchDetails;

    // Constructor for quick mapping
    public CandidateRecommendationDTO(Long candidatId, String candidatNom, Long offreId, 
                                      String offreTitre, Double scoreglobal, 
                                      String recommendationLevel) {
        this.candidatId = candidatId;
        this.candidatNom = candidatNom;
        this.offreId = offreId;
        this.offreTitre = offreTitre;
        this.scoreglobal = scoreglobal;
        this.recommendationLevel = recommendationLevel;
    }
}
