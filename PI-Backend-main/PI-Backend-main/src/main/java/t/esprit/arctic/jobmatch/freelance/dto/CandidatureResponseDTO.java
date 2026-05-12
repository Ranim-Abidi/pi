package t.esprit.arctic.jobmatch.freelance.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CandidatureResponseDTO {
    private Long id;
    private Long missionId;
    private String missionTitre;
    private Long utilisateurId;
    private String utilisateurNom;
    private String statut;
    private String datePostulation;
    private String coverLetter;
    private Double bidAmount;
    private Integer estimatedDays;
}