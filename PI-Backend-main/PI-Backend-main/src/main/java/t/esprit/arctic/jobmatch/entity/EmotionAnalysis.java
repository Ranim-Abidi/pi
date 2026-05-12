package t.esprit.arctic.jobmatch.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "emotion_analysis")
public class EmotionAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entretien_id", nullable = false)
    private Entretien entretien;

    @Column(name = "status", length = 32, nullable = false)
    private String status; // RUNNING, COMPLETED, FAILED

    @Column(name = "total_frames", nullable = false)
    private Integer totalFrames = 0;

    @Column(name = "processed_frames", nullable = false)
    private Integer processedFrames = 0;

    // Aggregate emotion scores (0-100)
    @Column(name = "avg_joy", nullable = true)
    private Double averageJoy;

    @Column(name = "avg_anger", nullable = true)
    private Double averageAnger;

    @Column(name = "avg_sadness", nullable = true)
    private Double averageSadness;

    @Column(name = "avg_surprise", nullable = true)
    private Double averageSurprise;

    @Column(name = "avg_fear", nullable = true)
    private Double averageFear;

    @Column(name = "avg_neutral", nullable = true)
    private Double averageNeutral;

    // Voice analysis scores (0-100)
    @Column(name = "avg_stress_level", nullable = true)
    private Double averageStressLevel;

    @Column(name = "avg_confidence", nullable = true)
    private Double averageConfidence;

    @Column(name = "avg_pitch_variation", nullable = true)
    private Double averagePitchVariation;

    @Column(name = "speaking_rate", nullable = true)
    private Double speakingRate; // words per minute

    @Column(name = "silence_duration", nullable = true)
    private Long silenceDuration; // in seconds

    // Overall assessment
    @Column(columnDefinition = "TEXT", nullable = true)
    private String overallAssessment;

    @Column(name = "dominat_emotion", length = 32, nullable = true)
    private String dominantEmotion; // The most expressed emotion

    @Column(name = "engagement_score", nullable = true)
    private Double engagementScore; // 0-100

    @OneToMany(mappedBy = "emotionAnalysis", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<EmotionFrame> emotionFrames;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at", nullable = true)
    private LocalDateTime completedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) {
            status = "RUNNING";
        }
    }
}
