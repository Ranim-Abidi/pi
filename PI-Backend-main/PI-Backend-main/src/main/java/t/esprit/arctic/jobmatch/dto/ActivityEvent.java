package t.esprit.arctic.jobmatch.dto;

import lombok.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ActivityEvent {
    private String type;
    private String partenaireNom;
    private String offreType;
    private String message;
    private String time;
    private String icon;
}