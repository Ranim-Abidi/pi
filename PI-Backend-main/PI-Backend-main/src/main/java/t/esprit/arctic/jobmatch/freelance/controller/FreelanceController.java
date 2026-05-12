package t.esprit.arctic.jobmatch.freelance.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.freelance.dto.CandidatureRequestDTO;
import t.esprit.arctic.jobmatch.freelance.dto.CandidatureResponseDTO;
import t.esprit.arctic.jobmatch.freelance.dto.MissionDTO;
import t.esprit.arctic.jobmatch.freelance.dto.MissionResponseDTO;
import t.esprit.arctic.jobmatch.freelance.entity.MissionStatut;
import t.esprit.arctic.jobmatch.freelance.service.freelanceCandidatureService;
import t.esprit.arctic.jobmatch.freelance.service.MissionService;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/freelance")
@RequiredArgsConstructor
public class FreelanceController {

    private final MissionService missionService;
    private final freelanceCandidatureService candidatureService;

    // ── Missions CRUD ─────────────────────────────────────────────────

    /** Freelancer view: all open missions */
    @GetMapping("/missions")
    public ResponseEntity<List<MissionResponseDTO>> getMissionsOuvertes() {
        return ResponseEntity.ok(missionService.getMissionsOuvertes());
    }

    @GetMapping("/missions/search")
    public ResponseEntity<Page<MissionResponseDTO>> searchMissions(
            Principal principal,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) String skill,
            @RequestParam(required = false) String experienceLevel,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String availability,
            @RequestParam(required = false) MissionStatut status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "dateCreation") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(defaultValue = "false") boolean onlyMine
    ) {
        return ResponseEntity.ok(missionService.searchMissions(
                principal.getName(), minPrice, maxPrice, skill, experienceLevel, location, availability,
                status, page, size, sortBy, sortDir, onlyMine
        ));
    }

    /** Single mission detail */
    @GetMapping("/missions/{id}")
    public ResponseEntity<MissionResponseDTO> getMission(@PathVariable Long id) {
        return ResponseEntity.ok(missionService.getMissionById(id));
    }

    /** Client: create a new mission */
    @PostMapping("/missions")
    public ResponseEntity<MissionResponseDTO> creerMission(
            @Valid @RequestBody MissionDTO dto,
            Principal principal) {
        return ResponseEntity.ok(missionService.creerMission(dto, principal.getName()));
    }

    /** Client: update an existing mission */
    @PutMapping("/missions/{id}")
    public ResponseEntity<MissionResponseDTO> updateMission(
            @PathVariable Long id,
            @Valid @RequestBody MissionDTO dto,
            Principal principal) {
        return ResponseEntity.ok(missionService.updateMission(id, dto, principal.getName()));
    }

    /** Client: delete a mission */
    @DeleteMapping("/missions/{id}")
    public ResponseEntity<Void> deleteMission(
            @PathVariable Long id,
            Principal principal) {
        missionService.deleteMission(id, principal.getName());
        return ResponseEntity.noContent().build();
    }

    /** Client dashboard: missions posted by the authenticated user */
    @GetMapping("/missions/mes-missions")
    public ResponseEntity<List<MissionResponseDTO>> mesMissions(Principal principal) {
        return ResponseEntity.ok(missionService.getMissionsParPublisher(principal.getName()));
    }

    // ── Candidatures ──────────────────────────────────────────────────

    /** Freelancer/Candidat: apply to a mission */
    @PostMapping("/missions/{id}/postuler")
    public ResponseEntity<CandidatureResponseDTO> postuler(
            @PathVariable Long id,
            @RequestBody(required = false) CandidatureRequestDTO request,
            Principal principal) {
        return ResponseEntity.ok(candidatureService.postuler(id, principal.getName(), request));
    }

    /** Client: view applications for a specific mission */
    @GetMapping("/missions/{id}/candidatures")
    public ResponseEntity<List<CandidatureResponseDTO>> candidaturesDeMission(
            @PathVariable Long id) {
        return ResponseEntity.ok(candidatureService.getCandidaturesDeMission(id));
    }

    /** Freelancer: view my own applications */
    @GetMapping("/candidatures/mes-candidatures")
    public ResponseEntity<List<CandidatureResponseDTO>> mesCandidatures(Principal principal) {
        return ResponseEntity.ok(candidatureService.mesCandidatures(principal.getName()));
    }

    @GetMapping("/candidatures/mes-candidatures/search")
    public ResponseEntity<Page<CandidatureResponseDTO>> mesCandidaturesSearch(
            Principal principal,
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "datePostulation") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        return ResponseEntity.ok(candidatureService.searchMesCandidatures(
                principal.getName(), statut, search, page, size, sortBy, sortDir
        ));
    }

    @PutMapping("/candidatures/{id}/shortlist")
    public ResponseEntity<CandidatureResponseDTO> shortlistCandidature(@PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(candidatureService.shortlistCandidature(id, principal.getName()));
    }

    /** Client: accept an application */
    @PutMapping("/candidatures/{id}/accepter")
    public ResponseEntity<CandidatureResponseDTO> accepterCandidature(@PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(candidatureService.accepterCandidature(id, principal.getName()));
    }

    /** Client: reject an application */
    @PutMapping("/candidatures/{id}/rejeter")
    public ResponseEntity<CandidatureResponseDTO> rejeterCandidature(@PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(candidatureService.rejeterCandidature(id, principal.getName()));
    }
}