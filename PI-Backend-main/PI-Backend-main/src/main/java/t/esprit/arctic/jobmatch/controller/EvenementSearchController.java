package t.esprit.arctic.jobmatch.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.dto.EvenementResponse;
import t.esprit.arctic.jobmatch.dto.EvenementSearchDTO;
import t.esprit.arctic.jobmatch.service.EvenementSearchService;
import java.util.List;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class EvenementSearchController {

    private final EvenementSearchService searchService;

    // ── Recherche principale ──────────────────────────────────────────
    // GET /api/search/evenements?q=Tunis&candidatId=5
    // Retourne résultats + suggestions + historique en une seule réponse
    @GetMapping("/evenements")
    public ResponseEntity<EvenementSearchDTO> rechercher(
            @RequestParam(required = false, defaultValue = "") String q,
            @RequestParam(required = false) Long candidatId) {
        return ResponseEntity.ok(searchService.rechercher(q, candidatId));
    }

    // ── Suggestions uniquement ────────────────────────────────────────
    // GET /api/search/suggestions?candidatId=5
    // Appelé au chargement de la page pour afficher des suggestions proactives
    @GetMapping("/suggestions")
    public ResponseEntity<List<EvenementResponse>> suggestions(
            @RequestParam Long candidatId) {
        return ResponseEntity.ok(searchService.getSuggestions(candidatId));
    }

    // ── Historique uniquement ─────────────────────────────────────────
    // GET /api/search/historique?candidatId=5
    // Appelé quand le candidat clique sur la barre de recherche (dropdown)
    @GetMapping("/historique")
    public ResponseEntity<List<String>> historique(
            @RequestParam Long candidatId) {
        return ResponseEntity.ok(searchService.getHistorique(candidatId));
    }
}