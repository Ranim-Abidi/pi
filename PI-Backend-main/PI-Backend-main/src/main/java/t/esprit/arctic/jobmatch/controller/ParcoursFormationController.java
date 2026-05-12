package t.esprit.arctic.jobmatch.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.dto.ParcoursCreateRequest;
import t.esprit.arctic.jobmatch.dto.ParcoursFormationDTO;
import t.esprit.arctic.jobmatch.entity.Formation;
import t.esprit.arctic.jobmatch.entity.ParcoursFormation;
import t.esprit.arctic.jobmatch.service.ParcoursFormationService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/parcours")
@RequiredArgsConstructor
public class ParcoursFormationController {

    private final ParcoursFormationService parcoursService;

    @GetMapping
    public ResponseEntity<List<ParcoursFormation>> getAll() {
        return ResponseEntity.ok(parcoursService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ParcoursFormation> getById(@PathVariable Long id) {
        return ResponseEntity.ok(parcoursService.getById(id));
    }

    @GetMapping("/categorie/{categorie}")
    public ResponseEntity<List<ParcoursFormation>> getByCategorie(@PathVariable String categorie) {
        return ResponseEntity.ok(parcoursService.getByCategorie(categorie));
    }

    @GetMapping("/{id}/niveaux")
    public ResponseEntity<Map<String, Formation>> getNiveaux(@PathVariable Long id) {
        ParcoursFormation parcours = parcoursService.getById(id);
        Map<String, Formation> niveaux = new HashMap<>();
        niveaux.put("DEBUTANT", parcours.getNiveauDebutant());
        niveaux.put("INTERMEDIAIRE", parcours.getNiveauIntermediaire());
        niveaux.put("AVANCE", parcours.getNiveauAvance());
        niveaux.put("EXPERT", parcours.getNiveauExpert());
        return ResponseEntity.ok(niveaux);
    }

    /** Crée un parcours en liant 4 formations existantes */
    @PostMapping
    public ResponseEntity<ParcoursFormation> create(@RequestBody ParcoursFormationDTO dto) {
        return ResponseEntity.ok(parcoursService.create(dto));
    }

    /** Wizard admin : crée les 4 formations + le parcours en une seule requête */
    @PostMapping("/avec-formations")
    public ResponseEntity<ParcoursFormation> createAvecFormations(
            @RequestBody ParcoursCreateRequest request) {
        return ResponseEntity.ok(parcoursService.createAvecFormations(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ParcoursFormation> update(
            @PathVariable Long id, @RequestBody ParcoursFormationDTO dto) {
        return ResponseEntity.ok(parcoursService.update(id, dto));
    }

    @PutMapping("/{id}/avec-formations")
    public ResponseEntity<ParcoursFormation> updateAvecFormations(
            @PathVariable Long id, @RequestBody ParcoursCreateRequest request) {
        return ResponseEntity.ok(parcoursService.updateAvecFormations(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        parcoursService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/archiver")
    public ResponseEntity<ParcoursFormation> archiver(@PathVariable Long id) {
        return ResponseEntity.ok(parcoursService.archiver(id));
    }

    @PatchMapping("/{id}/desarchiver")
    public ResponseEntity<ParcoursFormation> desarchiver(@PathVariable Long id) {
        return ResponseEntity.ok(parcoursService.desarchiver(id));
    }
}
