package t.esprit.arctic.jobmatch.freelance.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.freelance.dto.FreelanceChatMessageDTO;
import t.esprit.arctic.jobmatch.freelance.dto.FreelanceChatRoomDTO;
import t.esprit.arctic.jobmatch.freelance.dto.FreelanceContractDTO;
import t.esprit.arctic.jobmatch.freelance.dto.FreelanceDisputeDTO;
import t.esprit.arctic.jobmatch.freelance.dto.FreelanceMilestoneDTO;
import t.esprit.arctic.jobmatch.freelance.service.FreelanceWorkspaceService;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/freelance/workspace")
@RequiredArgsConstructor
public class FreelanceWorkspaceController {

    private final FreelanceWorkspaceService workspaceService;

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : null;
    }

    // ==========================================
    // CHAT
    // ==========================================

    @GetMapping("/rooms")
    public ResponseEntity<List<FreelanceChatRoomDTO>> getMyRooms() {
        return ResponseEntity.ok(workspaceService.getMyRooms(getCurrentUserEmail()));
    }

    @PostMapping("/rooms/get-or-create")
    public ResponseEntity<FreelanceChatRoomDTO> getOrCreateRoom(@RequestBody Map<String, Long> payload) {
        Long missionId = payload.get("missionId");
        Long freelancerId = payload.get("freelancerId");
        return ResponseEntity.ok(workspaceService.getOrCreateRoom(getCurrentUserEmail(), missionId, freelancerId));
    }

    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<List<FreelanceChatMessageDTO>> getMessages(@PathVariable Long roomId) {
        return ResponseEntity.ok(workspaceService.getRoomMessages(roomId, getCurrentUserEmail()));
    }

    @PostMapping("/rooms/{roomId}/messages")
    public ResponseEntity<FreelanceChatMessageDTO> sendMessage(@PathVariable Long roomId, @RequestBody Map<String, String> payload) {
        String content = payload.get("content");
        return ResponseEntity.ok(workspaceService.sendMessage(getCurrentUserEmail(), roomId, content));
    }

    // ==========================================
    // CONTRACTS & PAYMENTS
    // ==========================================

    @GetMapping("/contracts")
    public ResponseEntity<List<FreelanceContractDTO>> getMyContracts() {
        return ResponseEntity.ok(workspaceService.getMyContracts(getCurrentUserEmail()));
    }

    @PostMapping("/contracts/propose")
    public ResponseEntity<FreelanceContractDTO> proposeContract(@RequestBody Map<String, Object> payload) {
        Long missionId = Long.valueOf(payload.get("missionId").toString());
        Long freelancerId = Long.valueOf(payload.get("freelancerId").toString());
        Double amount = Double.valueOf(payload.get("amount").toString());
        String terms = payload.get("terms").toString();

        return ResponseEntity.ok(workspaceService.proposeContract(getCurrentUserEmail(), missionId, freelancerId, amount, terms));
    }

    @PostMapping("/contracts/{id}/accept")
    public ResponseEntity<FreelanceContractDTO> acceptContract(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        String signature = payload.get("signature") != null ? payload.get("signature").toString() : "";
        return ResponseEntity.ok(workspaceService.acceptContract(getCurrentUserEmail(), id, signature));
    }

    @PostMapping("/contracts/{id}/fund")
    public ResponseEntity<FreelanceContractDTO> fundEscrow(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        Double amount = Double.valueOf(payload.get("amount").toString());
        return ResponseEntity.ok(workspaceService.fundEscrow(getCurrentUserEmail(), id, amount));
    }

    @PostMapping("/contracts/{id}/release")
    public ResponseEntity<FreelanceContractDTO> releasePayment(@PathVariable Long id) {
        return ResponseEntity.ok(workspaceService.releasePayment(getCurrentUserEmail(), id));
    }

    @PostMapping("/contracts/{id}/pause")
    public ResponseEntity<FreelanceContractDTO> pauseContract(@PathVariable Long id) {
        return ResponseEntity.ok(workspaceService.pauseContract(getCurrentUserEmail(), id));
    }

    @PostMapping("/contracts/{id}/resume")
    public ResponseEntity<FreelanceContractDTO> resumeContract(@PathVariable Long id) {
        return ResponseEntity.ok(workspaceService.resumeContract(getCurrentUserEmail(), id));
    }

    @PostMapping("/contracts/{id}/cancel")
    public ResponseEntity<FreelanceContractDTO> cancelContract(@PathVariable Long id) {
        return ResponseEntity.ok(workspaceService.cancelContract(getCurrentUserEmail(), id));
    }

    @PostMapping("/contracts/generate")
    public ResponseEntity<FreelanceContractDTO> generateContract(@RequestBody Map<String, Object> payload) {
        Long missionId = Long.valueOf(payload.get("missionId").toString());
        Long freelancerId = Long.valueOf(payload.get("freelancerId").toString());
        Double amount = Double.valueOf(payload.get("amount").toString());

        return ResponseEntity.ok(workspaceService.generateContract(getCurrentUserEmail(), missionId, freelancerId, amount));
    }

    @PostMapping("/contracts/{id}/milestones")
    public ResponseEntity<FreelanceMilestoneDTO> addMilestone(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        String title = payload.get("title").toString();
        String description = payload.get("description") != null ? payload.get("description").toString() : "";
        Double amount = Double.valueOf(payload.get("amount").toString());

        LocalDateTime dueDate = null;
        if (payload.get("dueDate") != null && !payload.get("dueDate").toString().isEmpty()) {
            String dateStr = payload.get("dueDate").toString();
            if (dateStr.length() == 10) { // YYYY-MM-DD
                dueDate = LocalDate.parse(dateStr).atStartOfDay();
            } else {
                dueDate = LocalDateTime.parse(dateStr);
            }
        }

        return ResponseEntity.ok(workspaceService.addMilestone(getCurrentUserEmail(), id, title, description, amount, dueDate));
    }

    @PostMapping("/contracts/{id}/stripe-fund")
    public ResponseEntity<FreelanceContractDTO> simulateStripeFund(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        Double amount = Double.valueOf(payload.get("amount").toString());
        String stripeToken = payload.get("stripeToken").toString();
        return ResponseEntity.ok(workspaceService.simulateStripePayment(getCurrentUserEmail(), id, amount, stripeToken));
    }

    @PostMapping("/milestones/{id}/revision")
    public ResponseEntity<FreelanceMilestoneDTO> requestMilestoneRevision(@PathVariable Long id, @RequestBody(required = false) Map<String, String> payload) {
        String feedback = payload != null ? payload.getOrDefault("feedback", "") : "";
        return ResponseEntity.ok(workspaceService.requestMilestoneRevision(getCurrentUserEmail(), id, feedback));
    }

    @PostMapping("/milestones/{id}/submit")
    public ResponseEntity<FreelanceMilestoneDTO> submitMilestone(@PathVariable Long id, @RequestBody(required = false) Map<String, String> payload) {
        String submissionNote = payload != null ? payload.getOrDefault("submissionNote", "") : "";
        String deliveryUrl = payload != null ? payload.getOrDefault("deliveryUrl", "") : "";
        return ResponseEntity.ok(workspaceService.submitMilestone(getCurrentUserEmail(), id, submissionNote, deliveryUrl));
    }

    @PostMapping("/milestones/{id}/approve")
    public ResponseEntity<FreelanceMilestoneDTO> approveMilestone(@PathVariable Long id, @RequestBody(required = false) Map<String, String> payload) {
        String feedback = payload != null ? payload.getOrDefault("feedback", "") : "";
        return ResponseEntity.ok(workspaceService.approveMilestone(getCurrentUserEmail(), id, feedback));
    }

    @PostMapping("/milestones/{id}/release")
    public ResponseEntity<FreelanceMilestoneDTO> releaseMilestone(@PathVariable Long id) {
        return ResponseEntity.ok(workspaceService.releaseMilestonePayment(getCurrentUserEmail(), id));
    }

    @PostMapping("/contracts/{id}/disputes")
    public ResponseEntity<FreelanceDisputeDTO> openDispute(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        return ResponseEntity.ok(workspaceService.openDispute(
                getCurrentUserEmail(),
                id,
                payload.getOrDefault("reason", ""),
                payload.getOrDefault("evidenceNotes", "")
        ));
    }

    // ==========================================
    // RATINGS (client ↔ freelancer)
    // ==========================================

    /** Client rates freelancer after contract completion */
    @PostMapping("/contracts/{id}/rate/freelancer")
    public ResponseEntity<FreelanceContractDTO> rateFreelancer(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload) {
        Integer rating = payload.get("rating") != null ? Integer.valueOf(payload.get("rating").toString()) : null;
        String comment = payload.get("comment") != null ? payload.get("comment").toString() : "";
        return ResponseEntity.ok(workspaceService.rateFreelancer(getCurrentUserEmail(), id, rating, comment));
    }

    /** Freelancer rates client after contract completion */
    @PostMapping("/contracts/{id}/rate/client")
    public ResponseEntity<FreelanceContractDTO> rateClient(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload) {
        Integer rating = payload.get("rating") != null ? Integer.valueOf(payload.get("rating").toString()) : null;
        String comment = payload.get("comment") != null ? payload.get("comment").toString() : "";
        return ResponseEntity.ok(workspaceService.rateClient(getCurrentUserEmail(), id, rating, comment));
    }

    @GetMapping("/contracts/{id}/disputes")
    public ResponseEntity<List<FreelanceDisputeDTO>> getDisputes(@PathVariable Long id) {
        return ResponseEntity.ok(workspaceService.getContractDisputes(getCurrentUserEmail(), id));
    }

    @PostMapping("/disputes/{id}/resolve")
    public ResponseEntity<FreelanceDisputeDTO> resolveDispute(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        return ResponseEntity.ok(workspaceService.resolveDispute(getCurrentUserEmail(), id, payload.getOrDefault("resolution", "CLOSED")));
    }
}
