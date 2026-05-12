package t.esprit.arctic.jobmatch.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.entity.Localisation;
import t.esprit.arctic.jobmatch.service.LocalisationService;

import java.util.List;

@RestController
@RequestMapping("/api/localisations")
@RequiredArgsConstructor
public class LocalisationController {

    private final LocalisationService service;

    @GetMapping
    public List<Localisation> getAll() {
        return service.getAll();
    }

    @GetMapping("/{id}")
    public Localisation getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @PostMapping
    public Localisation create(@RequestBody Localisation localisation) {
        return service.create(localisation);
    }

    @PutMapping("/{id}")
    public Localisation update(@PathVariable Long id, @RequestBody Localisation localisation) {
        return service.update(id, localisation);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
