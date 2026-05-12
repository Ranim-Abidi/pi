package t.esprit.arctic.jobmatch.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.dto.QuizGenerationRequest;
import t.esprit.arctic.jobmatch.dto.QuizResultatDTO;
import t.esprit.arctic.jobmatch.dto.QuizSoumissionDTO;
import t.esprit.arctic.jobmatch.entity.QuizNiveau;
import t.esprit.arctic.jobmatch.service.QuizNiveauService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/quiz-niveau")
@RequiredArgsConstructor
public class QuizNiveauController {

    private final QuizNiveauService quizService;
    private final ObjectMapper mapper;

    /** Génère un quiz Groq pour le niveau actuel */
    @PostMapping("/generer")
    public ResponseEntity<?> generer(@RequestBody QuizGenerationRequest request) {
        try {
            QuizNiveau quiz = quizService.genererQuiz(request);
            // Retourner le quiz SANS les bonnes réponses
            return ResponseEntity.ok(sanitizeQuizForClient(quiz));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Récupère un quiz (questions sans bonnes réponses) */
    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        try {
            QuizNiveau quiz = quizService.getById(id);
            return ResponseEntity.ok(sanitizeQuizForClient(quiz));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /** Soumet les réponses, retourne résultat */
    @PostMapping("/soumettre")
    public ResponseEntity<?> soumettre(@RequestBody QuizSoumissionDTO dto) {
        try {
            QuizResultatDTO resultat = quizService.soumettre(dto);
            return ResponseEntity.ok(resultat);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Récupère le résultat détaillé d'un quiz déjà passé */
    @GetMapping("/{id}/resultat")
    public ResponseEntity<?> getResultat(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(quizService.getResultat(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Historique des quiz du candidat pour une inscription parcours */
    @GetMapping("/inscription/{inscriptionParcoursId}")
    public ResponseEntity<List<QuizNiveau>> getHistorique(
            @PathVariable Long inscriptionParcoursId) {
        return ResponseEntity.ok(quizService.getHistorique(inscriptionParcoursId));
    }

    /**
     * Masque les bonnes réponses et explications avant d'envoyer au client.
     */
    private Map<String, Object> sanitizeQuizForClient(QuizNiveau quiz) {
        try {
            JsonNode root = mapper.readTree(quiz.getQuestionsJson());
            JsonNode questionsNode = root.has("questions") ? root.get("questions") : root;

            ArrayNode sanitized = mapper.createArrayNode();
            if (questionsNode.isArray()) {
                for (JsonNode q : questionsNode) {
                    ObjectNode cleaned = mapper.createObjectNode();
                    cleaned.put("id", q.path("id").asInt());
                    cleaned.put("enonce", q.path("enonce").asText());
                    cleaned.set("choix", q.path("choix"));
                    // NE PAS inclure bonneReponse et explication
                    sanitized.add(cleaned);
                }
            }

            return Map.of(
                    "id", quiz.getId(),
                    "niveau", quiz.getNiveau().name(),
                    "niveauLabel", quiz.getNiveau().toNiveauLabel(),
                    "tentative", quiz.getTentative(),
                    "questions", sanitized,
                    "seuilRequis", quiz.getNiveau().seuilReussite()
            );
        } catch (Exception e) {
            return Map.of(
                    "id", quiz.getId(),
                    "niveau", quiz.getNiveau().name(),
                    "error", "Erreur parsing questions"
            );
        }
    }
}
