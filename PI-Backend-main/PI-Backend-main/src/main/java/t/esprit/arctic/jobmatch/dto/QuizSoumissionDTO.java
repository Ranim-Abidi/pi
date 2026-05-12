package t.esprit.arctic.jobmatch.dto;

import lombok.*;

import java.util.Map;

/**
 * Soumission des réponses du candidat pour un quiz.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizSoumissionDTO {
    private Long quizNiveauId;
    /** questionIndex -> réponse choisie (ex: "A", "B", "C", "D") */
    private Map<Integer, String> reponses;
}
