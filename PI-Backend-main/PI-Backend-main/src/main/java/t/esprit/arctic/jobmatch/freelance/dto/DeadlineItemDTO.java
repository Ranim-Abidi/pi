package t.esprit.arctic.jobmatch.freelance.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeadlineItemDTO {
    private String kind; // EVENT | MILESTONE
    private Long sourceId;
    private String title;
    private String dueDate;
    private String status;
    private Long missionId;
    private String missionTitre;
}
