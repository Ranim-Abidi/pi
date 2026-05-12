package t.esprit.arctic.jobmatch.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OffreStatistiquesDTO {
    private Long offreId;
    private String titrOffre;
    private String entreprise;
    private String recruteurNom;
    private String recruteurEmail;
    private Long nombreCandidatures;
    private Long nombreCandidaturesAcceptees;
    private String derniereCandidatureDate;
    private String salaire;
    private String typeContrat;
}
