package t.esprit.arctic.jobmatch.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.util.Date;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class InscriptionFormation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Temporal(TemporalType.DATE)
    private Date dateInscription;

    @NotBlank(message = "Le statut est requis")
    @Pattern(regexp = "(EnCours|Terminé|Abandonné)", message = "Statut invalide")
    private String statut;

    @Min(value = 0, message = "La progression ne peut pas être négative")
    @Max(value = 100, message = "La progression ne peut pas dépasser 100")
    private Double progression;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "formation_id", nullable = false)
    @JsonIgnoreProperties({
            "inscriptions", "competences",
            "hibernateLazyInitializer", "handler"
    })
    private Formation formation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidat_id", nullable = false)
    @JsonIgnoreProperties({
            "inscriptions", "educations", "backgrounds",
            "competences", "motDePasse", "candidatures",
            "hibernateLazyInitializer", "handler"
    })
    private Candidat candidat;

    @OneToOne(mappedBy = "inscription", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private Certificat certificat;

    private Integer tentativesQuizFinal = 0;
    
    @Column(name = "parcours_id")
    private Long parcoursId;

    @Column(name = "niveau_context")
    private String niveauContext;
}