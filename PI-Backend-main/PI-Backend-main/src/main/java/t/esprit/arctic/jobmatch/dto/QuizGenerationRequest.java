package t.esprit.arctic.jobmatch.dto;

import lombok.*;
import t.esprit.arctic.jobmatch.entity.NiveauOrdre;

/**
 * Requête envoyée par le frontend pour générer un quiz adaptatif via Groq.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizGenerationRequest {
    private Long inscriptionParcoursId;
    private NiveauOrdre niveau;
    private String titreFormation;
    private String contexteContenu;   // optionnel — enrichit le prompt
    private int nombreQuestions;       // défaut = 10
}
