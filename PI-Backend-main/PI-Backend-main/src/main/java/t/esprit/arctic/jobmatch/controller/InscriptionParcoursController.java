package t.esprit.arctic.jobmatch.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.entity.Formation;
import t.esprit.arctic.jobmatch.entity.InscriptionParcours;
import t.esprit.arctic.jobmatch.service.InscriptionParcoursService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inscription-parcours")
@RequiredArgsConstructor
public class InscriptionParcoursController {

    private final InscriptionParcoursService inscriptionService;

    /** S'inscrire à un parcours */
    @PostMapping
    public ResponseEntity<InscriptionParcours> inscrire(@RequestBody Map<String, Long> body) {
        Long candidatId = body.get("candidatId");
        Long parcoursId = body.get("parcoursId");
        if (candidatId == null || parcoursId == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(inscriptionService.inscrire(candidatId, parcoursId));
    }

    /** Mes inscriptions parcours */
    @GetMapping("/candidat/{candidatId}")
    public ResponseEntity<List<InscriptionParcours>> getByCandidat(@PathVariable Long candidatId) {
        return ResponseEntity.ok(inscriptionService.getMesInscriptions(candidatId));
    }

    /** Détail d'une inscription (niveau actuel, statut) */
    @GetMapping("/{id}")
    public ResponseEntity<InscriptionParcours> getById(@PathVariable Long id) {
        return ResponseEntity.ok(inscriptionService.getById(id));
    }

    /** Retourne la formation du niveau actuel */
    @GetMapping("/{id}/formation-actuelle")
    public ResponseEntity<Formation> getFormationActuelle(@PathVariable Long id) {
        return ResponseEntity.ok(inscriptionService.getFormationActuelle(id));
    }

    /** Inscription spécifique candidat + parcours */
    @GetMapping("/candidat/{candidatId}/parcours/{parcoursId}")
    public ResponseEntity<InscriptionParcours> getInscription(
            @PathVariable Long candidatId, @PathVariable Long parcoursId) {
        return ResponseEntity.ok(inscriptionService.getInscription(candidatId, parcoursId));
    }
}
