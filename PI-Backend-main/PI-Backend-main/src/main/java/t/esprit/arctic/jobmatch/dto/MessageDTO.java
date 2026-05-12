package t.esprit.arctic.jobmatch.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.LocalDateTime;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class MessageDTO {
    private Long id;
    
    private String subject;
    private String contenu;
    private String senderEmail;
    private String senderName;
    private String receiverEmail;
    private String receiverName;
    
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime dateEnvoi;
    
    private boolean lu;
    private String type; // ACCEPTATION, REJET, ENTRETIEN, AUTRE
    
    private Long candidatId;
    private Long candidatureId;

    public MessageDTO() {}

    public MessageDTO(Long id, String subject, String contenu, String senderEmail, 
                     String senderName, LocalDateTime dateEnvoi, boolean lu, String type) {
        this.id = id;
        this.subject = subject;
        this.contenu = contenu;
        this.senderEmail = senderEmail;
        this.senderName = senderName;
        this.dateEnvoi = dateEnvoi;
        this.lu = lu;
        this.type = type;
    }

    // Getters et Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getContenu() { return contenu; }
    public void setContenu(String contenu) { this.contenu = contenu; }

    public String getSenderEmail() { return senderEmail; }
    public void setSenderEmail(String senderEmail) { this.senderEmail = senderEmail; }

    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }

    public String getReceiverEmail() { return receiverEmail; }
    public void setReceiverEmail(String receiverEmail) { this.receiverEmail = receiverEmail; }

    public String getReceiverName() { return receiverName; }
    public void setReceiverName(String receiverName) { this.receiverName = receiverName; }

    public LocalDateTime getDateEnvoi() { return dateEnvoi; }
    public void setDateEnvoi(LocalDateTime dateEnvoi) { this.dateEnvoi = dateEnvoi; }

    public boolean isLu() { return lu; }
    public void setLu(boolean lu) { this.lu = lu; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Long getCandidatId() { return candidatId; }
    public void setCandidatId(Long candidatId) { this.candidatId = candidatId; }

    public Long getCandidatureId() { return candidatureId; }
    public void setCandidatureId(Long candidatureId) { this.candidatureId = candidatureId; }
}
