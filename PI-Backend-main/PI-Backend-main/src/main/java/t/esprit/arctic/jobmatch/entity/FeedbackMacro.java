package t.esprit.arctic.jobmatch.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.util.Date;

@Entity
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class FeedbackMacro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Integer noteGlobale;
    private String progression;
    private String experienceQuiz;
    private String recommandation;

    @Column(length = 2000)
    private String commentaireLibre;

    @OneToOne
    @JoinColumn(name = "inscription_id")
    @JsonIgnore
    private InscriptionParcours inscription;

    @ManyToOne
    @JoinColumn(name = "candidat_id")
    @JsonIgnore
    private Candidat candidat;

    @ManyToOne
    @JoinColumn(name = "parcours_id")
    @JsonIgnore
    private ParcoursFormation parcours;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = new Date();
    }
}
