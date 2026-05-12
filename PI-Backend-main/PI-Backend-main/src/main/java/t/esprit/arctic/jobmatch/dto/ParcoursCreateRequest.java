package t.esprit.arctic.jobmatch.dto;

import lombok.*;

/**
 * Requête envoyée par le wizard admin pour créer un parcours + ses 4 formations en une seule fois.
 * Chaque FormationDTO correspond à un niveau (Débutant, Intermédiaire, Avancé, Expert).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParcoursCreateRequest {

    /** Métadonnées du parcours */
    private String titre;
    private String categorie;
    private String imageUrl;
    private String description;

    /** Les 4 formations à créer, une par niveau */
    private FormationDTO formationDebutant;
    private FormationDTO formationIntermediaire;
    private FormationDTO formationAvance;
    private FormationDTO formationExpert;
}
