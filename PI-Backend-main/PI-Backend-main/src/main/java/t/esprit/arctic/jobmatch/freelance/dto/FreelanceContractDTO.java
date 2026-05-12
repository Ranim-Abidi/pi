package t.esprit.arctic.jobmatch.freelance.dto;

import lombok.Data;
import t.esprit.arctic.jobmatch.freelance.entity.ContractStatus;
import t.esprit.arctic.jobmatch.freelance.entity.FreelanceContract;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
public class FreelanceContractDTO {
    private Long id;
    private Long missionId;
    private String missionTitre;
    private Long clientId;
    private String clientNom;
    private Long freelancerId;
    private String freelancerNom;
    private Double amount;
    private String terms;
    private ContractStatus status;
    private String createdAt;

    // Payment details (simulated)
    private Double totalPaid;
    private Double inEscrow;
    
    private String smartContractHash;
    private Integer termsVersion;
    private String auditTrail;
    private Boolean clientAccepted;
    private Boolean freelancerAccepted;
    private String clientSignature;
    private String freelancerSignature;
    private Double totalEscrow;

    // Ratings (client ↔ freelancer)
    private Integer clientRating;
    private String clientRatingComment;
    private Integer freelancerRating;
    private String freelancerRatingComment;

    private List<FreelanceMilestoneDTO> milestones;

    public static FreelanceContractDTO fromEntity(FreelanceContract contract) {
        FreelanceContractDTO dto = new FreelanceContractDTO();
        dto.setId(contract.getId());
        dto.setMissionId(contract.getMission().getId());
        dto.setMissionTitre(contract.getMission().getTitre());
        dto.setClientId(contract.getClient().getId());
        dto.setClientNom(contract.getClient().getNom());
        dto.setFreelancerId(contract.getFreelancer().getId());
        dto.setFreelancerNom(contract.getFreelancer().getNom());
        dto.setAmount(contract.getAmount());
        dto.setTerms(contract.getTerms());
        dto.setStatus(contract.getStatus());
        dto.setCreatedAt(contract.getCreatedAt().toString());
        dto.setSmartContractHash(contract.getSmartContractHash());
        dto.setTermsVersion(contract.getTermsVersion());
        dto.setAuditTrail(contract.getAuditTrail());
        dto.setClientAccepted(contract.getClientAccepted());
        dto.setFreelancerAccepted(contract.getFreelancerAccepted());
        dto.setClientSignature(contract.getClientSignature());
        dto.setFreelancerSignature(contract.getFreelancerSignature());
        dto.setTotalEscrow(contract.getTotalEscrow());

        dto.setClientRating(contract.getClientRating());
        dto.setClientRatingComment(contract.getClientRatingComment());
        dto.setFreelancerRating(contract.getFreelancerRating());
        dto.setFreelancerRatingComment(contract.getFreelancerRatingComment());
        
        if (contract.getMilestones() != null) {
            dto.setMilestones(contract.getMilestones().stream()
                .map(FreelanceMilestoneDTO::fromEntity)
                .collect(Collectors.toList()));
        }
        
        return dto;
    }
}
