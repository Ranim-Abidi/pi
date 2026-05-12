package t.esprit.arctic.jobmatch.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class OrganisateurReputationResponse {
    private Long organisateurId;
    private String nomOrganisateur;
    private Double noteMoyenneGlobale;
    private Long totalFeedbacks;
    private String badgeReputation;
    private Double noteMoyenneParType;
    private Long totalFeedbacksParType;
    private String badgeType;
    private Double noteMoyenneTitrePasse;
    private String badgeTitre;
}