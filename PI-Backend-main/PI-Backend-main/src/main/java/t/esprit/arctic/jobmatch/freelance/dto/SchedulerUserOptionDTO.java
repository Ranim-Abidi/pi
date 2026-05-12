package t.esprit.arctic.jobmatch.freelance.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SchedulerUserOptionDTO {
    private Long id;
    private String nom;
    private String email;
    private String role;
}
