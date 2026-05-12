package t.esprit.arctic.jobmatch.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.entity.Feedback;
import t.esprit.arctic.jobmatch.dto.FeedbackDTO;
import org.springframework.beans.BeanUtils;
import t.esprit.arctic.jobmatch.dto.FeedbackMacroDTO;
import t.esprit.arctic.jobmatch.entity.FeedbackMacro;
import t.esprit.arctic.jobmatch.service.FeedbackService;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/feedbacks")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;


    @GetMapping
    public ResponseEntity<List<Feedback>> getAll() {
        return ResponseEntity.ok(feedbackService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Feedback> getById(@PathVariable Long id) {
        return ResponseEntity.ok(feedbackService.getById(id));
    }

    @PostMapping
    public ResponseEntity<Feedback> create(@Valid @RequestBody FeedbackDTO feedbackDto) {
        Feedback feedback = new Feedback();
        BeanUtils.copyProperties(feedbackDto, feedback);
        return ResponseEntity.ok(feedbackService.create(feedback));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Feedback> update(@PathVariable Long id, @Valid @RequestBody FeedbackDTO feedbackDto) {
        Feedback feedback = new Feedback();
        BeanUtils.copyProperties(feedbackDto, feedback);
        return ResponseEntity.ok(feedbackService.update(id, feedback));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        feedbackService.delete(id);
        return ResponseEntity.noContent().build();
    }


    @GetMapping("/formation/{formationId}")
    public ResponseEntity<List<Feedback>> getByFormation(@PathVariable Long formationId) {
        return ResponseEntity.ok(feedbackService.getByFormation(formationId));
    }

    @GetMapping("/candidat/{candidatId}")
    public ResponseEntity<List<Feedback>> getByCandidat(@PathVariable Long candidatId) {
        return ResponseEntity.ok(feedbackService.getByCandidat(candidatId));
    }

    @GetMapping("/candidat/{candidatId}/formation/{formationId}")
    public ResponseEntity<List<Feedback>> getByCandidatAndFormation(
            @PathVariable Long candidatId,
            @PathVariable Long formationId) {
        return ResponseEntity.ok(feedbackService.getByCandidatAndFormation(candidatId, formationId));
    }

    @GetMapping("/parcours/{parcoursId}")
    public ResponseEntity<List<Feedback>> getByParcours(@PathVariable Long parcoursId) {
        return ResponseEntity.ok(feedbackService.getByParcours(parcoursId));
    }

    @GetMapping("/formation/{formationId}/moyenne")
    public ResponseEntity<Map<String, Object>> getNoteMoyenne(@PathVariable Long formationId) {
        Double moyenne = feedbackService.getNoteMoyenne(formationId);
        int total = feedbackService.getByFormation(formationId).size();
        return ResponseEntity.ok(Map.of("moyenne", moyenne, "total", total));
    }

    @PostMapping("/macro")
    public ResponseEntity<Void> saveMacro(@Valid @RequestBody FeedbackMacroDTO dto) {
        feedbackService.saveMacro(dto);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/parcours/{parcoursId}/macro")
    public ResponseEntity<List<FeedbackMacro>> getMacrosByParcours(@PathVariable Long parcoursId) {
        return ResponseEntity.ok(feedbackService.getMacroByParcours(parcoursId));
    }

    @GetMapping("/inscription/{inscriptionId}/macro")
    public ResponseEntity<FeedbackMacro> getMacroByInscription(@PathVariable Long inscriptionId) {
        return feedbackService.getMacroByInscriptionId(inscriptionId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
