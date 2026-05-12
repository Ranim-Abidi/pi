package t.esprit.arctic.jobmatch.freelance.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.freelance.dto.CandidatureRequestDTO;
import t.esprit.arctic.jobmatch.freelance.dto.CandidatureResponseDTO;
import t.esprit.arctic.jobmatch.freelance.dto.MissionDTO;
import t.esprit.arctic.jobmatch.freelance.dto.MissionResponseDTO;
import t.esprit.arctic.jobmatch.freelance.service.MissionService;
import t.esprit.arctic.jobmatch.freelance.service.freelanceCandidatureService;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/freelance/v2")
@RequiredArgsConstructor
public class FreelanceV2Controller {

    private final MissionService missionService;
    private final freelanceCandidatureService candidatureService;

    @GetMapping("/missions")
    public ResponseEntity<List<MissionResponseDTO>> getMissions() {
        return ResponseEntity.ok(missionService.getMissionsOuvertes());
    }

    @PostMapping("/missions")
    public ResponseEntity<MissionResponseDTO> createMission(@RequestBody MissionDTO dto, Principal principal) {
        return ResponseEntity.ok(missionService.creerMission(dto, principal.getName()));
    }

    @GetMapping("/missions/{id}/candidatures")
    public ResponseEntity<List<CandidatureResponseDTO>> missionCandidatures(@PathVariable Long id) {
        return ResponseEntity.ok(candidatureService.getCandidaturesDeMission(id));
    }

    @PostMapping("/missions/{id}/postuler")
    public ResponseEntity<CandidatureResponseDTO> postuler(@PathVariable Long id,
                                                           @RequestBody(required = false) CandidatureRequestDTO request,
                                                           Principal principal) {
        return ResponseEntity.ok(candidatureService.postuler(id, principal.getName(), request));
    }
}
