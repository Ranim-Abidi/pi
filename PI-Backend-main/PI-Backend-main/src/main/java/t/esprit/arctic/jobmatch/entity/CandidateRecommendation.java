package t.esprit.arctic.jobmatch.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "candidate_recommendations", indexes = {
    @Index(name = "idx_offre_candidat", columnList = "offre_id,candidat_id", unique = true),
    @Index(name = "idx_scoreglobal", columnList = "scoreglobal"),
    @Index(name = "idx_recommendation_level", columnList = "recommendation_level")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CandidateRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "offre_id", nullable = false)
    private OffreEmploi offre;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidat_id", nullable = false)
    private Candidat candidat;

    // Individual matching scores (0-1 normalized)
    @Column(name = "s_skills", nullable = false)
    private Double sSkills;

    @Column(name = "s_experience", nullable = false)
    private Double sExperience;

    @Column(name = "s_location", nullable = false)
    private Double sLocation;

    @Column(name = "s_domain", nullable = false)
    private Double sDomain;

    // Final scores
    @Column(name = "scoreglobal", nullable = false)
    private Double scoreglobal;  // 0-100

    @Column(name = "recommendation_level", nullable = false)
    private String recommendationLevel;  // "Très recommandé", "Recommandé", "Moyen", "Faible match"

    @Column(name = "binary_classification", nullable = false)
    private String binaryClassification;  // "Bon candidat" or "Mauvais candidat"

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "match_details", columnDefinition = "JSON")
    private String matchDetails;  // Store detailed matching info as JSON

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
