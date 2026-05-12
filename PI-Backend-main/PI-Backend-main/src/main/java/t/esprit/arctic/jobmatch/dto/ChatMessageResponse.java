package t.esprit.arctic.jobmatch.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChatMessageResponse {
    private Long id;
    private String contenu;
    private LocalDateTime envoyeA;
    private String nomExpediteur;
    private Long evenementId;
    private Long candidatId;
}