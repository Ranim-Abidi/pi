package t.esprit.arctic.jobmatch.freelance.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import t.esprit.arctic.jobmatch.entity.Utilisateur;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "fl_candidatures",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"mission_id", "candidat_id"}
        )
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class CandidatureMission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mission_id", nullable = false)
    private Mission mission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidat_id", nullable = false)
    private Utilisateur candidat;

    @Enumerated(EnumType.STRING)
    private CandidatureStatut statut = CandidatureStatut.EN_ATTENTE;

    @Column(columnDefinition = "TEXT")
    private String coverLetter;

    private Double bidAmount;

    private Integer estimatedDays;

    @CreationTimestamp
    private LocalDateTime datePostulation;
}