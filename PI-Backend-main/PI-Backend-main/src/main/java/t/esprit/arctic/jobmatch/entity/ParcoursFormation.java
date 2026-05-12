package t.esprit.arctic.jobmatch.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class ParcoursFormation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String titre;
    private String categorie;
    private String statut = "Disponible";

    @Column(length = 500)
    private String imageUrl;

    @Column(length = 1000)
    private String description;

    private Integer totalInscrits = 0;
    private Double scorePopularite = 0.0;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "debutant_id")
    @JsonIgnoreProperties({"inscriptions", "competences", "hibernateLazyInitializer", "handler"})
    private Formation niveauDebutant;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "intermediaire_id")
    @JsonIgnoreProperties({"inscriptions", "competences", "hibernateLazyInitializer", "handler"})
    private Formation niveauIntermediaire;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "avance_id")
    @JsonIgnoreProperties({"inscriptions", "competences", "hibernateLazyInitializer", "handler"})
    private Formation niveauAvance;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "expert_id")
    @JsonIgnoreProperties({"inscriptions", "competences", "hibernateLazyInitializer", "handler"})
    private Formation niveauExpert;

    /**
     * Retourne la Formation correspondant au niveau donné.
     */
    public Formation getFormationParNiveau(NiveauOrdre niveau) {
        return switch (niveau) {
            case DEBUTANT      -> niveauDebutant;
            case INTERMEDIAIRE -> niveauIntermediaire;
            case AVANCE        -> niveauAvance;
            case EXPERT        -> niveauExpert;
        };
    }
}
