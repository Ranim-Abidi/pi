package t.esprit.arctic.jobmatch.dto;

import lombok.Data;
import java.util.Date;

@Data
public class ParticipationRequest {
    private Long evenementId;
    private Long candidatId;
    private Date dateInscription;
    private String statut;


}