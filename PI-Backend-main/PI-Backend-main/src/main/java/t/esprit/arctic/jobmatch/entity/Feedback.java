package t.esprit.arctic.jobmatch.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.Date;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Integer note;

    private String commentaire;

    @Temporal(TemporalType.TIMESTAMP)
    private Date dateCreation;

    @Temporal(TemporalType.TIMESTAMP)
    private Date dateModification;

    @Temporal(TemporalType.TIMESTAMP)
    private Date date;

    @ManyToOne
    @JoinColumn(name = "formation_id", nullable = false)
    @JsonIgnoreProperties({ "inscriptions", "competences", "hibernateLazyInitializer", "handler" })
    private Formation formation;

    @ManyToOne
    @JoinColumn(name = "candidat_id", nullable = false)
    @JsonIgnoreProperties({
            "motDePasse", "inscriptions", "candidatures",
            "competences", "educations", "backgrounds",
            "hibernateLazyInitializer", "handler"
    })
    private Candidat candidat;

    @ManyToOne
    @JoinColumn(name = "participation_id")
    private Participation participation;

    @PrePersist
    public void prePersist() {
        this.dateCreation = new Date();
        this.dateModification = new Date();
    }

    @PreUpdate
    public void preUpdate() {
        this.dateModification = new Date();
    }
}