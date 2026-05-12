package t.esprit.arctic.jobmatch.freelance.dto;

import lombok.Data;
import t.esprit.arctic.jobmatch.freelance.entity.FreelanceChatRoom;

import java.time.LocalDateTime;

@Data
public class FreelanceChatRoomDTO {
    private Long id;
    private Long missionId;
    private String missionTitre;
    private Long clientId;
    private String clientNom;
    private Long freelancerId;
    private String freelancerNom;
    private String updatedAt;

    public static FreelanceChatRoomDTO fromEntity(FreelanceChatRoom room) {
        FreelanceChatRoomDTO dto = new FreelanceChatRoomDTO();
        dto.setId(room.getId());
        if (room.getMission() != null) {
            dto.setMissionId(room.getMission().getId());
            dto.setMissionTitre(room.getMission().getTitre());
        }
        dto.setClientId(room.getClient().getId());
        dto.setClientNom(room.getClient().getNom());
        dto.setFreelancerId(room.getFreelancer().getId());
        dto.setFreelancerNom(room.getFreelancer().getNom());
        dto.setUpdatedAt(room.getUpdatedAt().toString());
        return dto;
    }
}
