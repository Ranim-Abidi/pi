package t.esprit.arctic.jobmatch.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.dto.FeedbackEventRequest;
import t.esprit.arctic.jobmatch.dto.FeedbackEventResponse;
import t.esprit.arctic.jobmatch.dto.OrganisateurReputationResponse;
import t.esprit.arctic.jobmatch.service.FeedbackEventService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/feedbacks-evenement")
@RequiredArgsConstructor
public class FeedbackEventController {

    private final FeedbackEventService feedbackEventService;


    @PostMapping
    public ResponseEntity<FeedbackEventResponse> create(
            @RequestBody FeedbackEventRequest request) {
        return ResponseEntity.ok(feedbackEventService.create(request));
    }


    @GetMapping("/participation/{participationId}")
    public ResponseEntity<List<FeedbackEventResponse>> getByParticipation(
            @PathVariable Long participationId) {
        return ResponseEntity.ok(feedbackEventService.getByParticipation(participationId));
    }


    @GetMapping("/evenement/{evenementId}")
    public ResponseEntity<List<FeedbackEventResponse>> getByEvenement(
            @PathVariable Long evenementId) {
        return ResponseEntity.ok(feedbackEventService.getByEvenement(evenementId));
    }


    @GetMapping("/evenement/{evenementId}/moyenne")
    public ResponseEntity<Map<String, Object>> getNoteMoyenne(
            @PathVariable Long evenementId) {
        Double moyenne = feedbackEventService.getNoteMoyenne(evenementId);
        return ResponseEntity.ok(Map.of("moyenne", moyenne));
    }


    @PutMapping("/{id}")
    public ResponseEntity<FeedbackEventResponse> update(
            @PathVariable Long id,
            @RequestBody FeedbackEventRequest request) {
        return ResponseEntity.ok(feedbackEventService.update(id, request));
    }


    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        feedbackEventService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/reputation")
    public ResponseEntity<OrganisateurReputationResponse> getReputation(
            @RequestParam Long organisateurId,
            @RequestParam String nomOrganisateur,
            @RequestParam String type,
            @RequestParam String titre) {
        return ResponseEntity.ok(
                feedbackEventService.getReputation(
                        organisateurId, nomOrganisateur, type, titre
                )
        );
    }
}
