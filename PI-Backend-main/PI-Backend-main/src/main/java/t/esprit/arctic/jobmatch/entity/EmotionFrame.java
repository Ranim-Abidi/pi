package t.esprit.arctic.jobmatch.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "emotion_frames")
public class EmotionFrame {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "emotion_analysis_id", nullable = false)
    private EmotionAnalysis emotionAnalysis;

    @Column(name = "frame_number", nullable = false)
    private Integer frameNumber;

    @Column(name = "timestamp_seconds", nullable = false)
    private Double timestampSeconds; // Position in the interview video

    // Facial emotion detection scores (0-100)
    @Column(name = "joy", nullable = true)
    private Double joy;

    @Column(name = "anger", nullable = true)
    private Double anger;

    @Column(name = "sadness", nullable = true)
    private Double sadness;

    @Column(name = "surprise", nullable = true)
    private Double surprise;

    @Column(name = "fear", nullable = true)
    private Double fear;

    @Column(name = "neutral", nullable = true)
    private Double neutral;

    @Column(name = "face_detected", nullable = false)
    private Boolean faceDetected = false;

    // Voice analysis for this frame
    @Column(name = "voice_stress", nullable = true)
    private Double voiceStress; // 0-100

    @Column(name = "voice_confidence", nullable = true)
    private Double voiceConfidence; // 0-100

    @Column(name = "pitch", nullable = true)
    private Double pitch; // Hz

    @Column(name = "volume_level", nullable = true)
    private Double volumeLevel; // dB

    @Column(columnDefinition = "TEXT", nullable = true)
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
