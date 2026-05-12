package t.esprit.arctic.jobmatch.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.dto.CandidateStatsDTO;
import t.esprit.arctic.jobmatch.service.CandidateStatsService;

import java.util.List;

@RestController
@RequestMapping("/api/candidate-stats")
@RequiredArgsConstructor
@Slf4j
public class CandidateStatsController {

    private final CandidateStatsService candidateStatsService;

    /**
     * GET /api/candidate-stats/{candidatId}
     * Récupère les statistiques d'un candidat spécifique
     */
    @GetMapping("/{candidatId}")
    public ResponseEntity<CandidateStatsDTO> getCandidateStats(
            @PathVariable Long candidatId) {
        log.info("📊 GET /api/candidate-stats/{}", candidatId);
        CandidateStatsDTO stats = candidateStatsService.getCandidateStats(candidatId);
        return ResponseEntity.ok(stats);
    }

    /**
     * GET /api/candidate-stats/all
     * Récupère les statistiques pour tous les candidats (Admin)
     */
    @GetMapping("/all")
    public ResponseEntity<List<CandidateStatsDTO>> getAllCandidatesStats() {
        log.info("📊 GET /api/candidate-stats/all");
        List<CandidateStatsDTO> stats = candidateStatsService.getAllCandidatesStats();
        return ResponseEntity.ok(stats);
    }
}
