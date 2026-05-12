package t.esprit.arctic.jobmatch.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import t.esprit.arctic.jobmatch.entity.DomaineType;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/domaines")
public class DomaineController {

    @GetMapping
    public ResponseEntity<List<DomaineResponse>> getDomaines() {
        List<DomaineResponse> domaines = Arrays.stream(DomaineType.values())
                .map(d -> new DomaineResponse(d.name(), d.getLabel()))
                .toList();
        return ResponseEntity.ok(domaines);
    }

    public record DomaineResponse(String nom, String label) {}
}
