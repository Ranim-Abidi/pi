package t.esprit.arctic.jobmatch.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmotionAnalysisDTO {

    private Long id;
    private Long entretienId;
    private String status; // RUNNING, COMPLETED, FAILED
    private Integer totalFrames;
    private Integer processedFrames;

    // Facial emotions (averages)
    private Double averageJoy;
    private Double averageAnger;
    private Double averageSadness;
    private Double averageSurprise;
    private Double averageFear;
    private Double averageNeutral;

    // Voice analysis (averages)
    private Double averageStressLevel;
    private Double averageConfidence;
    private Double averagePitchVariation;
    private Double speakingRate;
    private Long silenceDuration;

    private String dominantEmotion;
    private Double engagementScore;
    private String overallAssessment;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;

    private List<EmotionFrameDTO> emotionFrames;
}
