package t.esprit.arctic.jobmatch.freelance.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor
public class CreateEventRequest {
    private String title;
    private String description;
    private String type;         // INTERVIEW, DEADLINE, MEETING, REVIEW, MILESTONE
    private String startDate;    // ISO string e.g. "2026-04-20T10:00"
    private String endDate;      // ISO string e.g. "2026-04-20T11:00"
    private Long missionId;      // optional
    private Long participantId;  // optional (generic counterparty)
    /** Explicit client link (freelancer/candidate scheduling with a client) */
    private Long clientId;
    /** Explicit freelancer link (client scheduling with a freelancer) */
    private Long freelancerId;
}
