package t.esprit.arctic.jobmatch.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import lombok.RequiredArgsConstructor;
import java.util.List;

import t.esprit.arctic.jobmatch.entity.Partenaire;
import t.esprit.arctic.jobmatch.entity.TypePartenaire;
import t.esprit.arctic.jobmatch.service.PartenaireService;
import t.esprit.arctic.jobmatch.entity.OffrePartenaire;
import t.esprit.arctic.jobmatch.dto.PartenaireTopDTO;

import t.esprit.arctic.jobmatch.dto.ComparaisonDTO;

@RestController
@RequestMapping("/api/partenaires")
@RequiredArgsConstructor
public class PartenaireController {

    private final PartenaireService service;

    @GetMapping
    public List<Partenaire> getAll() {
        return service.getAll();
    }

    @GetMapping("/{id}")
    public Partenaire getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @PostMapping
    public Partenaire create(@RequestBody Partenaire p) {
        return service.create(p);
    }

    @PutMapping("/{id}")
    public Partenaire update(@PathVariable Long id,
                             @RequestBody Partenaire p) {
        return service.update(id, p);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    @GetMapping("/type/{type}")
    public List<Partenaire> getByType(@PathVariable TypePartenaire type) {
        return service.getByType(type);
    }

    @GetMapping("/{id}/offres")
    public List<OffrePartenaire> getOffresByPartenaire(@PathVariable Long id) {
        Partenaire p = service.getById(id);
        return p.getOffres();
    }


    @GetMapping("/top/{limit}")
    public ResponseEntity<List<PartenaireTopDTO>> getTopPartenaires(
            @PathVariable int limit) {
        return ResponseEntity.ok(service.getTopPartenairesDTO(limit));
    }

    @GetMapping("/{id}/activity-rate")
    public ResponseEntity<Double> getActivityRate(
            @PathVariable Long id) {
        return ResponseEntity.ok(
                service.calculateActivityRate(id));
    }
    @GetMapping("/comparer")
    public ResponseEntity<ComparaisonDTO> comparer(
            @RequestParam Long id1,
            @RequestParam Long id2) {
        return ResponseEntity.ok(service.comparerPartenaires(id1, id2));
    }

    @PutMapping("/{id}/vues")
    public ResponseEntity<Void> incrementerVues(
            @PathVariable Long id) {
        service.incrementerVues(id);
        return ResponseEntity.ok().build();
    }


    @GetMapping("/{id}/vues")
    public ResponseEntity<Integer> getNombreVues(
            @PathVariable Long id) {
        return ResponseEntity.ok(service.getNombreVues(id));
    }
}
