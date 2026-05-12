package t.esprit.arctic.jobmatch.dto;

import lombok.*;
import com.fasterxml.jackson.annotation.JsonProperty;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProcessEmotionFrameRequest {

    private Integer frameNumber;
    private Double timestampSeconds;

    // Facial emotions (0-100)
    private Double joy;
    private Double anger;
    private Double sadness;
    private Double surprise;
    private Double fear;
    private Double neutral;
    private Boolean faceDetected;

    // Voice metrics
    private Double voiceStress;
    private Double voiceConfidence;
    private Double pitch;
    private Double volumeLevel;

    // Base64 encoded frame image (optional, for storage)
    @JsonProperty("frameImage")
    private String frameImage;

    // Base64 encoded audio chunk (optional, for voice analysis)
    @JsonProperty("audioChunk")
    private String audioChunk;

    private String notes;
}
