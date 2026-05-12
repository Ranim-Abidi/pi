package t.esprit.arctic.jobmatch.freelance.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.freelance.dto.FreelanceContractDTO;
import t.esprit.arctic.jobmatch.freelance.dto.FreelanceDisputeDTO;
import t.esprit.arctic.jobmatch.freelance.dto.FreelanceMilestoneDTO;
import t.esprit.arctic.jobmatch.freelance.service.FreelanceWorkspaceService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/freelance/v2/workspace")
@RequiredArgsConstructor
public class FreelanceWorkspaceV2Controller {

    private final FreelanceWorkspaceService workspaceService;

    private String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : null;
    }

    @GetMapping("/contracts")
    public ResponseEntity<List<FreelanceContractDTO>> getContracts() {
        return ResponseEntity.ok(workspaceService.getMyContracts(currentEmail()));
    }

    @PostMapping("/contracts/{id}/fund")
    public ResponseEntity<FreelanceContractDTO> fund(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Double amount = Double.valueOf(body.get("amount").toString());
        return ResponseEntity.ok(workspaceService.fundEscrow(currentEmail(), id, amount));
    }

    @PostMapping("/contracts/{id}/pause")
    public ResponseEntity<FreelanceContractDTO> pause(@PathVariable Long id) {
        return ResponseEntity.ok(workspaceService.pauseContract(currentEmail(), id));
    }

    @PostMapping("/contracts/{id}/resume")
    public ResponseEntity<FreelanceContractDTO> resume(@PathVariable Long id) {
        return ResponseEntity.ok(workspaceService.resumeContract(currentEmail(), id));
    }

    @PostMapping("/milestones/{id}/submit")
    public ResponseEntity<FreelanceMilestoneDTO> submitMilestone(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        String submissionNote = body != null ? body.getOrDefault("submissionNote", "") : "";
        String deliveryUrl = body != null ? body.getOrDefault("deliveryUrl", "") : "";
        return ResponseEntity.ok(workspaceService.submitMilestone(currentEmail(), id, submissionNote, deliveryUrl));
    }

    @PostMapping("/milestones/{id}/approve")
    public ResponseEntity<FreelanceMilestoneDTO> approveMilestone(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        String feedback = body != null ? body.getOrDefault("feedback", "") : "";
        return ResponseEntity.ok(workspaceService.approveMilestone(currentEmail(), id, feedback));
    }

    @PostMapping("/milestones/{id}/release")
    public ResponseEntity<FreelanceMilestoneDTO> releaseMilestone(@PathVariable Long id) {
        return ResponseEntity.ok(workspaceService.releaseMilestonePayment(currentEmail(), id));
    }

    @PostMapping("/contracts/{id}/disputes")
    public ResponseEntity<FreelanceDisputeDTO> openDispute(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(workspaceService.openDispute(
                currentEmail(),
                id,
                body.getOrDefault("reason", ""),
                body.getOrDefault("evidenceNotes", "")
        ));
    }

    @PostMapping("/disputes/{id}/resolve")
    public ResponseEntity<FreelanceDisputeDTO> resolveDispute(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(workspaceService.resolveDispute(currentEmail(), id, body.getOrDefault("resolution", "CLOSED")));
    }
}
