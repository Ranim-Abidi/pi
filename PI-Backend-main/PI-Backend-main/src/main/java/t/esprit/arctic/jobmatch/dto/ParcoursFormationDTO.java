package t.esprit.arctic.jobmatch.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParcoursFormationDTO {
    private Long id;
    private String titre;
    private String categorie;
    private String imageUrl;
    private String description;
    private Long niveauDebutantId;
    private Long niveauIntermediaireId;
    private Long niveauAvanceId;
    private Long niveauExpertId;
}
