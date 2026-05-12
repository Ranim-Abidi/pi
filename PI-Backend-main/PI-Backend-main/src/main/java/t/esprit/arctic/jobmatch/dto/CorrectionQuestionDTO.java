package t.esprit.arctic.jobmatch.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CorrectionQuestionDTO {
    private int questionId;
    private String enonce;
    private String reponseCandidat;
    private String bonneReponse;
    private boolean correct;
    private String explication;
}
