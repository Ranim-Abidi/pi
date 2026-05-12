package t.esprit.arctic.jobmatch.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.service.DashboardService;
import java.util.*;
import t.esprit.arctic.jobmatch.entity.OffrePartenaire;
import t.esprit.arctic.jobmatch.entity.TypeOffrePartenaire;
import t.esprit.arctic.jobmatch.repository.OffrePartenaireRepository;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final OffrePartenaireRepository offreRepo;


    @GetMapping("/top-partenaires")
    public ResponseEntity<List<Map<String, Object>>> getTop() {
        return ResponseEntity.ok(dashboardService.getTopPartenaires());
    }

    @GetMapping("/stats-keywords")
    public ResponseEntity<Map<String, Object>> getKeywords() {
        return ResponseEntity.ok(dashboardService.getStatsKeywords());
    }

    @GetMapping("/scores-popularite")
    public ResponseEntity<List<Map<String, Object>>> getScores() {
        return ResponseEntity.ok(dashboardService.getScoresPopularite());
    }
    @GetMapping("/activites-recentes")
    public ResponseEntity<List<Map<String, Object>>> getActivitesRecentes() {
        List<OffrePartenaire> dernieres = offreRepo.findDernieresOffres()
                .stream().limit(10).collect(Collectors.toList());

        List<Map<String, Object>> result = dernieres.stream().map(o -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("message", (o.getPartenaire() != null ? o.getPartenaire().getNom() : "?")
                    + " a publié une offre " + o.getType().name().toLowerCase());
            m.put("icon",    o.getType() == TypeOffrePartenaire.EMPLOI ? "💼" : "🎓");
            m.put("offreType", o.getType().name());
            m.put("time",    o.getDatePublication() != null
                    ? o.getDatePublication().toString() : "");
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @GetMapping("/dashboard-update")
    public ResponseEntity<Map<String, Object>> getDashboardUpdate() {
        Map<String, Object> update = new LinkedHashMap<>();
        update.put("topPartenaires", dashboardService.getTopPartenaires());
        update.put("scores",         dashboardService.getScoresPopularite());
        return ResponseEntity.ok(update);
    }
}
