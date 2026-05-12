package t.esprit.arctic.jobmatch.freelance.dto;

import lombok.*;
import t.esprit.arctic.jobmatch.freelance.entity.FreelanceAvailabilitySlot;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvailabilitySlotDTO {
    private Long id;
    private Long freelancerId;
    private String freelancerNom;
    private String startDate;
    private String endDate;
    private boolean booked;
    private Long bookedByUserId;

    public static AvailabilitySlotDTO fromEntity(FreelanceAvailabilitySlot slot) {
        return AvailabilitySlotDTO.builder()
                .id(slot.getId())
                .freelancerId(slot.getFreelancer().getId())
                .freelancerNom(slot.getFreelancer().getNom())
                .startDate(slot.getStartDate() != null ? slot.getStartDate().toString() : null)
                .endDate(slot.getEndDate() != null ? slot.getEndDate().toString() : null)
                .booked(slot.isBooked())
                .bookedByUserId(slot.getBookedByUserId())
                .build();
    }
}
