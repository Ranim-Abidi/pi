package t.esprit.arctic.jobmatch.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecommendationRequest {
    private Double s_skills;
    private Double s_experience;
    private Double s_location;
    private Double s_domain;
}
