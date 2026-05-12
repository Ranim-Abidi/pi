package t.esprit.arctic.jobmatch.dto;

import lombok.Data;

@Data
public class ChatMessageRequest {
    private Long evenementId;
    private Long candidatId;
    private String contenu;
}