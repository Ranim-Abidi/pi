package t.esprit.arctic.jobmatch.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.dto.OffreStatistiquesDTO;
import t.esprit.arctic.jobmatch.service.OffreStatistiquesService;

import java.util.List;

@RestController
@RequestMapping("/api/offres-stats")
@RequiredArgsConstructor
@Slf4j
public class OffreStatistiquesController {

    private final OffreStatistiquesService offreStatistiquesService;

    /**
     * GET /api/offres-stats/all
     * Récupère toutes les offres avec leurs statistiques de candidatures
     */
    @GetMapping("/all")
    public ResponseEntity<List<OffreStatistiquesDTO>> getOffresAvecStatistiques() {
        log.info("📊 GET /api/offres-stats/all");
        List<OffreStatistiquesDTO> offres = offreStatistiquesService.getOffresAvecStatistiques();
        return ResponseEntity.ok(offres);
    }

    /**
     * GET /api/offres-stats/recruiter/{recruteurId}
     * Récupère les offres d'un recruteur spécifique avec stats
     */
    @GetMapping("/recruiter/{recruteurId}")
    public ResponseEntity<List<OffreStatistiquesDTO>> getOffresRecruteur(
            @PathVariable Long recruteurId) {
        log.info("📊 GET /api/offres-stats/recruiter/{}", recruteurId);
        List<OffreStatistiquesDTO> offres = offreStatistiquesService.getOffresRecruteurAvecStats(recruteurId);
        return ResponseEntity.ok(offres);
    }

    /**
     * GET /api/offres-stats/salary?min=50&max=150&minCandidatures=5
     * Récupère les offres dans une plage de salaire avec minimum de candidatures
     */
    @GetMapping("/salary")
    public ResponseEntity<List<OffreStatistiquesDTO>> getOffresBySalaryRange(
            @RequestParam int min,
            @RequestParam int max,
            @RequestParam(defaultValue = "0") long minCandidatures) {
        log.info("📊 GET /api/offres-stats/salary?min={}&max={}&minCandidatures={}", 
                 min, max, minCandidatures);
        List<OffreStatistiquesDTO> offres = offreStatistiquesService.getOffresBySalaryRange(min, max, minCandidatures);
        return ResponseEntity.ok(offres);
    }

    /**
     * GET /api/offres-stats/top?limit=10
     * Récupère le top des offres par nombre de candidatures
     */
    @GetMapping("/top")
    public ResponseEntity<List<OffreStatistiquesDTO>> getTopOffres(
            @RequestParam(defaultValue = "10") int limit) {
        log.info("🏆 GET /api/offres-stats/top?limit={}", limit);
        List<OffreStatistiquesDTO> offres = offreStatistiquesService.getTopOffresByCandidatures(limit);
        return ResponseEntity.ok(offres);
    }
}
