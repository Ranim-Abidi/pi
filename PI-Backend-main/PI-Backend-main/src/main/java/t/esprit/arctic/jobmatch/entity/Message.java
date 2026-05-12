package t.esprit.arctic.jobmatch.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "messages")
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String subject;
    
    @Column(columnDefinition = "TEXT")
    private String contenu;
    
    private String senderEmail;
    private String senderName;
    
    private String receiverEmail;
    private String receiverName;
    
    @ManyToOne
    @JoinColumn(name = "candidat_id")
    private Candidat candidat;
    
    @ManyToOne
    @JoinColumn(name = "candidature_id", nullable = true)
    private Candidature candidature;
    
    private LocalDateTime dateEnvoi;
    private boolean lu = false;
    
    private String type; // ACCEPTATION, REJET, ENTRETIEN, AUTRE
    
    public Message() {}
    
    public Message(String subject, String contenu, Candidat candidat, String type) {
        this.subject = subject;
        this.contenu = contenu;
        this.candidat = candidat;
        this.dateEnvoi = LocalDateTime.now();
        this.type = type;
        this.lu = false;
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

    public Candidat getCandidat() { return candidat; }
    public void setCandidat(Candidat candidat) { this.candidat = candidat; }

    public Candidature getCandidature() { return candidature; }
    public void setCandidature(Candidature candidature) { this.candidature = candidature; }

    public LocalDateTime getDateEnvoi() { return dateEnvoi; }
    public void setDateEnvoi(LocalDateTime dateEnvoi) { this.dateEnvoi = dateEnvoi; }

    public boolean isLu() { return lu; }
    public void setLu(boolean lu) { this.lu = lu; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
}
