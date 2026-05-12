package t.esprit.arctic.jobmatch.freelance.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateAvailabilitySlotRequest {
    private String startDate;
    private String endDate;
}
