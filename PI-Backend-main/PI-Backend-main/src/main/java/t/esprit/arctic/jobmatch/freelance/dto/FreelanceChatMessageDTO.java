package t.esprit.arctic.jobmatch.freelance.dto;

import lombok.Data;
import t.esprit.arctic.jobmatch.freelance.entity.FreelanceChatMessage;

import java.time.LocalDateTime;

@Data
public class FreelanceChatMessageDTO {
    private Long id;
    private Long roomId;
    private Long senderId;
    private String senderNom;
    private String content;
    private boolean isRead;
    private String createdAt;

    public static FreelanceChatMessageDTO fromEntity(FreelanceChatMessage msg) {
        FreelanceChatMessageDTO dto = new FreelanceChatMessageDTO();
        dto.setId(msg.getId());
        dto.setRoomId(msg.getRoom().getId());
        dto.setSenderId(msg.getSender().getId());
        dto.setSenderNom(msg.getSender().getNom());
        dto.setContent(msg.getContent());
        dto.setRead(msg.isRead());
        dto.setCreatedAt(msg.getCreatedAt().toString());
        return dto;
    }
}
