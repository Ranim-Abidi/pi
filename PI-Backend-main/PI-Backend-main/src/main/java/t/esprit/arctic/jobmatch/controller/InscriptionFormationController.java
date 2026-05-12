package t.esprit.arctic.jobmatch.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.entity.InscriptionFormation;
import t.esprit.arctic.jobmatch.service.InscriptionFormationService;
import java.util.List;

@RestController
@RequestMapping("/api/inscriptions")
@RequiredArgsConstructor
public class InscriptionFormationController {

    private final InscriptionFormationService inscriptionService;

    @GetMapping
    public ResponseEntity<List<InscriptionFormation>> getAll() {
        return ResponseEntity.ok(inscriptionService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<InscriptionFormation> getById(@PathVariable Long id) {
        return ResponseEntity.ok(inscriptionService.getById(id));
    }

    @PostMapping
    public ResponseEntity<InscriptionFormation> create(@RequestBody InscriptionFormation inscription) {
        return ResponseEntity.ok(inscriptionService.create(inscription));
    }

    @PutMapping("/{id}")
    public ResponseEntity<InscriptionFormation> update(@PathVariable Long id,
                                                       @RequestBody InscriptionFormation inscription) {
        return ResponseEntity.ok(inscriptionService.update(id, inscription));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        inscriptionService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/candidat/{candidatId}")
    public ResponseEntity<List<InscriptionFormation>> getByCandidat(@PathVariable Long candidatId) {
        try {
            List<InscriptionFormation> inscriptions = inscriptionService.getByCandidat(candidatId);
            return ResponseEntity.ok(inscriptions);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/formation/{formationId}")
    public ResponseEntity<List<InscriptionFormation>> getByFormation(@PathVariable Long formationId) {
        try {
            List<InscriptionFormation> inscriptions = inscriptionService.getByFormation(formationId);
            return ResponseEntity.ok(inscriptions);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/candidat/{candidatId}/formation/{formationId}")
    public ResponseEntity<InscriptionFormation> getByDetails(
            @PathVariable Long candidatId,
            @PathVariable Long formationId,
            @RequestParam(required = false) Long parcoursId) {
        try {
            InscriptionFormation ins = inscriptionService.getByCandidatAndFormationAndParcours(candidatId, formationId, parcoursId);
            return ResponseEntity.ok(ins);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
