package t.esprit.arctic.jobmatch.freelance.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AutoBookRequest {
    private Long freelancerId;
    private String title;
    private String description;
    private String type;
    private String startDate;
    private String endDate;
    private Long missionId;
}
