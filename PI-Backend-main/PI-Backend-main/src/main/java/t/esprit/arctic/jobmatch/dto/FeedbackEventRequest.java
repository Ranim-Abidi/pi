package t.esprit.arctic.jobmatch.dto;

import lombok.Data;
import java.util.Date;

@Data
public class FeedbackEventRequest {
    private String commentaire;
    private int note;
    private Date date;
    private Long participationId;
}