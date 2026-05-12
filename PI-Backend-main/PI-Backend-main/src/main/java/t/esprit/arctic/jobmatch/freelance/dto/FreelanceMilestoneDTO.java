package t.esprit.arctic.jobmatch.freelance.dto;

import lombok.Data;
import t.esprit.arctic.jobmatch.freelance.entity.FreelanceMilestone;
import t.esprit.arctic.jobmatch.freelance.entity.MilestoneStatus;

import java.time.LocalDateTime;

@Data
public class FreelanceMilestoneDTO {
    private Long id;
    private Long contractId;
    private String title;
    private String description;
    private Double amount;
    private String dueDate;
    private MilestoneStatus status;
    private String createdAt;
    private String submissionNote;
    private String deliveryUrl;
    private String clientFeedback;
    private String submittedAt;
    private String approvedAt;

    public static FreelanceMilestoneDTO fromEntity(FreelanceMilestone milestone) {
        FreelanceMilestoneDTO dto = new FreelanceMilestoneDTO();
        dto.setId(milestone.getId());
        dto.setContractId(milestone.getContract().getId());
        dto.setTitle(milestone.getTitle());
        dto.setDescription(milestone.getDescription());
        dto.setAmount(milestone.getAmount());
        dto.setDueDate(milestone.getDueDate() != null ? milestone.getDueDate().toString() : null);
        dto.setStatus(milestone.getStatus());
        dto.setCreatedAt(milestone.getCreatedAt().toString());
        dto.setSubmissionNote(milestone.getSubmissionNote());
        dto.setDeliveryUrl(milestone.getDeliveryUrl());
        dto.setClientFeedback(milestone.getClientFeedback());
        dto.setSubmittedAt(milestone.getSubmittedAt() != null ? milestone.getSubmittedAt().toString() : null);
        dto.setApprovedAt(milestone.getApprovedAt() != null ? milestone.getApprovedAt().toString() : null);
        return dto;
    }
}
