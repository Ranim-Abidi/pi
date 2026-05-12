package t.esprit.arctic.jobmatch.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "sender_id", nullable = true)
    private Long senderId;

    @Column(nullable = false)
    private String type; // "follow", "message", "interview_reminder", "offer_expired", etc.

    @Column(nullable = false)
    private String message; // "[UserName] started following you"

    @Column(name = "is_read", nullable = false)
    private Boolean isRead = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "entretien_id", nullable = true)
    private Long entretienId;

    @Column(name = "offre_emploi_id", nullable = true)
    private Long offreEmploiId;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
