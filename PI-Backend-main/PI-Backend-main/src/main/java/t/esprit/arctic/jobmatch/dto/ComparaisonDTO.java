package t.esprit.arctic.jobmatch.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ComparaisonDTO {

    private Long id1;
    private String nom1;
    private int nbOffres1;
    private double tauxActivite1;

    private Long id2;
    private String nom2;
    private int nbOffres2;
    private double tauxActivite2;

    private String meilleur;
}