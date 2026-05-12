package t.esprit.arctic.jobmatch.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.Date;

@Entity
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class InscriptionParcours {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "candidat_id", nullable = false)
    @JsonIgnoreProperties({
        "inscriptions", "educations", "backgrounds",
        "competences", "motDePasse", "candidatures",
        "hibernateLazyInitializer", "handler"
    })
    private Candidat candidat;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "parcours_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private ParcoursFormation parcours;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NiveauOrdre niveauActuel = NiveauOrdre.DEBUTANT;

    @Temporal(TemporalType.TIMESTAMP)
    private Date dateInscription;

    /** EN_COURS ou TERMINE */
    @Column(nullable = false)
    private String statut = "EN_COURS";

    private boolean evaluationParcoursRequise = false;
}
