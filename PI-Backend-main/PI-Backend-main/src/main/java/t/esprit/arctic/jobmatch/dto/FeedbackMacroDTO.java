package t.esprit.arctic.jobmatch.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedbackMacroDTO {
    private Long inscriptionId;
    private Long parcoursId;
    private Long candidatId;
    private Integer noteGlobale;
    private String progression;
    private String experienceQuiz;
    private String recommandation;
    private String commentaireLibre;
}
