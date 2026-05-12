package t.esprit.arctic.jobmatch.controller;

import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.Map;

import t.esprit.arctic.jobmatch.entity.OffrePartenaire;
import t.esprit.arctic.jobmatch.entity.TypeOffrePartenaire;
import t.esprit.arctic.jobmatch.service.OffrePartenaireService;
import t.esprit.arctic.jobmatch.service.OffrePredictionService;  // ← ajouté
import org.springframework.http.ResponseEntity;

@RestController
@RequestMapping("/api/offres-partenaires")
@RequiredArgsConstructor
public class OffrePartenaireController {

    private final OffrePartenaireService service;
    private final OffrePredictionService predictionService;  // ← ajouté

    @GetMapping
    public List<OffrePartenaire> getAll() {
        return service.getAll();
    }

    @GetMapping("/{id}")
    public OffrePartenaire getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @PostMapping
    public OffrePartenaire create(@RequestBody OffrePartenaire o) {
        return service.create(o);
    }

    @PutMapping("/{id}")
    public OffrePartenaire update(@PathVariable Long id,
                                  @RequestBody OffrePartenaire o) {
        return service.update(id, o);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    @GetMapping("/partenaire/{id}")
    public List<OffrePartenaire> getByPartenaire(@PathVariable Long id) {
        return service.getByPartenaire(id);
    }

    @GetMapping("/type/{type}")
    public List<OffrePartenaire> getByType(@PathVariable TypeOffrePartenaire type) {
        return service.getByType(type);
    }

    @GetMapping("/search")
    public ResponseEntity<List<OffrePartenaire>> searchByKeyword(
            @RequestParam String keyword) {
        return ResponseEntity.ok(service.searchByKeyword(keyword));
    }


    @GetMapping("/predict-naive/{partenaireId}")
    public ResponseEntity<String> predictNextOffreType(
            @PathVariable Long partenaireId) {
        return ResponseEntity.ok(
                service.predictNextOffreType(partenaireId));
    }


    @GetMapping("/predict/{partenaireId}")
    public ResponseEntity<Map<String, Object>> predictML(
            @PathVariable Long partenaireId) {
        return ResponseEntity.ok(
                predictionService.predict(partenaireId));
    }

    @PutMapping("/{id}/epingle")
    public ResponseEntity<OffrePartenaire> toggleEpingle(
            @PathVariable Long id) {
        return ResponseEntity.ok(service.toggleEpingle(id));
    }

    @GetMapping("/partenaire/{id}/triees")
    public ResponseEntity<List<OffrePartenaire>> getByPartenaireTriees(
            @PathVariable Long id) {
        return ResponseEntity.ok(service.getByPartenaireTriees(id));
    }
}
