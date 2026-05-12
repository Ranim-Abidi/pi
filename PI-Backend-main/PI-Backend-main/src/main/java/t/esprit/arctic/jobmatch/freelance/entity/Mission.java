package t.esprit.arctic.jobmatch.freelance.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import t.esprit.arctic.jobmatch.entity.Utilisateur;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "fl_missions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Mission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String titre;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Double budget;

    private String experienceLevel;
    private String location;
    private Boolean remoteAvailable;
    private String availability;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
            name = "fl_mission_competences",
            joinColumns = @JoinColumn(name = "mission_id")
    )
    @Column(name = "competence")
    private List<String> competences = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    private MissionStatut statut = MissionStatut.OUVERTE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "publie_par_id")
    private Utilisateur publiePar;

    @CreationTimestamp
    private LocalDateTime dateCreation;
}