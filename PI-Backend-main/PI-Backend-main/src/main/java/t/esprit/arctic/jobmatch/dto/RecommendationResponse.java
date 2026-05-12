package t.esprit.arctic.jobmatch.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecommendationResponse {
    @JsonProperty("Scoreglobal")
    private Double scoreglobal;

    @JsonProperty("binary_classification")
    private String binaryClassification;

    @JsonProperty("multi_class_classification")
    private String multiClassClassification;
}
