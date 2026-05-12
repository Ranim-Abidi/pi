package t.esprit.arctic.jobmatch.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmotionFrameDTO {

    private Long id;
    private Integer frameNumber;
    private Double timestampSeconds;

    // Facial emotions
    private Double joy;
    private Double anger;
    private Double sadness;
    private Double surprise;
    private Double fear;
    private Double neutral;
    private Boolean faceDetected;

    // Voice analysis
    private Double voiceStress;
    private Double voiceConfidence;
    private Double pitch;
    private Double volumeLevel;

    private String notes;
    private LocalDateTime createdAt;
}
