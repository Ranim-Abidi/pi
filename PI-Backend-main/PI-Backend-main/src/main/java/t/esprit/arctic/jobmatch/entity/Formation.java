package t.esprit.arctic.jobmatch.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class Formation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String titre;
    private String categorie;
    private String plateforme;
    private String statut;
    private String duree;
    private String niveau;

    @Column(length = 500)
    private String lienExterne;

    @Column(length = 100)
    private String playlistId;

    @Column(length = 100)
    private String youtubeId;

    private Boolean hasEditor;

    @Column(length = 500)
    private String stackBlitzUrl;

    @Column(length = 500)
    private String writtenUrl;

    @Column(length = 1000)
    private String description;

    @Column(length = 500)
    private String imageUrl;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "formation_competence",
            joinColumns = @JoinColumn(name = "formation_id"),
            inverseJoinColumns = @JoinColumn(name = "competence_id")
    )
    @JsonIgnore
    private List<Competence> competences;

    @OneToMany(mappedBy = "formation", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<InscriptionFormation> inscriptions;

    @Column(name = "score_popularite")
    private Double scorePopularite = 0.0;

    @Column(name = "badge", length = 50)
    private String badge;

    @Column(name = "total_inscrits")
    private Integer totalInscrits = 0;

    @Column(name = "note_moyenne")
    private Double noteMoyenne = 0.0;

    @Column(name = "taux_completion")
    private Double tauxCompletion = 0.0;
}