package t.esprit.arctic.jobmatch.freelance.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.freelance.dto.FreelanceStatsDTO;
import t.esprit.arctic.jobmatch.freelance.dto.MatchResultDTO;
import t.esprit.arctic.jobmatch.freelance.service.FreelanceAnalyticsService;
import t.esprit.arctic.jobmatch.freelance.service.FreelanceMatchingService;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/freelance/ai")
@RequiredArgsConstructor
public class FreelanceAIController {

    private final FreelanceMatchingService matchingService;
    private final FreelanceAnalyticsService analyticsService;

    // ── AI Matching ──────────────────────────────────────────────────────

    /** Freelancer: get my AI-recommended missions */
    @GetMapping("/match-missions")
    public ResponseEntity<List<MatchResultDTO>> matchMissions(Principal principal) {
        return ResponseEntity.ok(matchingService.matchMissionsForFreelancer(principal.getName()));
    }

    /** Client: get AI-recommended talents for a specific mission */
    @GetMapping("/match-talents/{missionId}")
    public ResponseEntity<List<MatchResultDTO>> matchTalents(@PathVariable Long missionId) {
        return ResponseEntity.ok(matchingService.matchTalentsForMission(missionId));
    }

    // ── Analytics / Stats ────────────────────────────────────────────────

    /** Freelancer: get my KPI stats */
    @GetMapping("/stats/freelancer")
    public ResponseEntity<FreelanceStatsDTO> freelancerStats(Principal principal) {
        return ResponseEntity.ok(analyticsService.getFreelancerStats(principal.getName()));
    }

    /** Client: get my KPI stats */
    @GetMapping("/stats/client")
    public ResponseEntity<FreelanceStatsDTO> clientStats(Principal principal) {
        return ResponseEntity.ok(analyticsService.getClientStats(principal.getName()));
    }
}
