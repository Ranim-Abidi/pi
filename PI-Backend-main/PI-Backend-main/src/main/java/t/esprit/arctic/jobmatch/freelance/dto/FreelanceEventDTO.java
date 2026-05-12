package t.esprit.arctic.jobmatch.freelance.dto;

import lombok.*;
import t.esprit.arctic.jobmatch.freelance.entity.FreelanceEvent;

import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class FreelanceEventDTO {
    private Long id;
    private String title;
    private String description;
    private String type;         // INTERVIEW, DEADLINE, MEETING, REVIEW, MILESTONE
    private String startDate;    // ISO string
    private String endDate;      // ISO string
    private String status;       // SCHEDULED, CONFIRMED, CANCELLED, COMPLETED
    private Long missionId;
    private String missionTitre;
    private Long organizerId;
    private String organizerNom;
    private Long participantId;
    private String participantNom;

    public static FreelanceEventDTO fromEntity(FreelanceEvent e) {
        return FreelanceEventDTO.builder()
                .id(e.getId())
                .title(e.getTitle())
                .description(e.getDescription())
                .type(e.getType().name())
                .startDate(e.getStartDate() != null ? e.getStartDate().toString() : null)
                .endDate(e.getEndDate() != null ? e.getEndDate().toString() : null)
                .status(e.getStatus() != null ? e.getStatus().name() : "SCHEDULED")
                .missionId(e.getMission() != null ? e.getMission().getId() : null)
                .missionTitre(e.getMission() != null ? e.getMission().getTitre() : null)
                .organizerId(e.getOrganizer().getId())
                .organizerNom(e.getOrganizer().getNom())
                .participantId(e.getParticipant() != null ? e.getParticipant().getId() : null)
                .participantNom(e.getParticipant() != null ? e.getParticipant().getNom() : null)
                .build();
    }
}
