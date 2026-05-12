package t.esprit.arctic.jobmatch.freelance.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CandidatureRequestDTO {
    private String coverLetter;
    private Double bidAmount;
    private Integer estimatedDays;
}
