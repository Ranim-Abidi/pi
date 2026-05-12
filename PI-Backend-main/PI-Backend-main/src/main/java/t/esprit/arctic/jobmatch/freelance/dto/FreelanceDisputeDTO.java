package t.esprit.arctic.jobmatch.freelance.dto;

import lombok.Data;
import t.esprit.arctic.jobmatch.freelance.entity.FreelanceDispute;

@Data
public class FreelanceDisputeDTO {
    private Long id;
    private Long contractId;
    private Long openedById;
    private String openedByName;
    private String reason;
    private String evidenceNotes;
    private String status;
    private String createdAt;

    public static FreelanceDisputeDTO fromEntity(FreelanceDispute dispute) {
        FreelanceDisputeDTO dto = new FreelanceDisputeDTO();
        dto.setId(dispute.getId());
        dto.setContractId(dispute.getContract().getId());
        dto.setOpenedById(dispute.getOpenedBy().getId());
        dto.setOpenedByName(dispute.getOpenedBy().getNom());
        dto.setReason(dispute.getReason());
        dto.setEvidenceNotes(dispute.getEvidenceNotes());
        dto.setStatus(dispute.getStatus().name());
        dto.setCreatedAt(dispute.getCreatedAt().toString());
        return dto;
    }
}
