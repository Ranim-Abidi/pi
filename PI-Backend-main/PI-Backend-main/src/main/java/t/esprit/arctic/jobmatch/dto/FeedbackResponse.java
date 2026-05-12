package t.esprit.arctic.jobmatch.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedbackResponse {
    private Long id;
    private String commentaire;
    private int note;
    private Date date;
    private Long participationId;
    private Long formationId;
}
