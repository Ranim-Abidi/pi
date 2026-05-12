package t.esprit.arctic.jobmatch.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MatchingScoresDTO {
    private Double sSkills;
    private Double sExperience;
    private Double sLocation;
    private Double sDomain;
}
