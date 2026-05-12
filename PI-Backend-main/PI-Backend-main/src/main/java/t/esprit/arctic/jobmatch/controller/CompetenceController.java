package t.esprit.arctic.jobmatch.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.entity.Competence;
import t.esprit.arctic.jobmatch.service.CompetenceService;

import java.util.List;

@RestController
@RequestMapping("/api/competences")
@RequiredArgsConstructor
public class CompetenceController {

    private final CompetenceService service;

    @PostMapping
    public ResponseEntity<Competence> create(@Valid @RequestBody Competence competence) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(competence));
    }

    @GetMapping
    public ResponseEntity<List<Competence>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Competence> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Competence> update(@PathVariable Long id, @Valid @RequestBody Competence competenceDetails) {
        return ResponseEntity.ok(service.update(id, competenceDetails));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}

