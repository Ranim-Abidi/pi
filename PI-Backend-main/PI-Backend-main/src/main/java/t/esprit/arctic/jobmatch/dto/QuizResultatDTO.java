package t.esprit.arctic.jobmatch.dto;

import lombok.*;
import t.esprit.arctic.jobmatch.entity.NiveauOrdre;
import t.esprit.arctic.jobmatch.entity.FeedbackType;

import java.util.List;

/**
 * Résultat retourné au candidat après soumission du quiz.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizResultatDTO {
    private int score;
    private int seuilRequis;
    private boolean reussi;
    private FeedbackType needsFeedback; // NONE | MICRO | MACRO
    private NiveauOrdre niveau;
    private String nextNiveauLabel;     // null si Expert ou échoué
    private NiveauOrdre niveauSuivantDebloque;
    private String message;
    private Long inscriptionId;
    private List<CorrectionQuestionDTO> corrections;
}
