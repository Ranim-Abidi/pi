package t.esprit.arctic.jobmatch.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "login_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LoginHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "utilisateur_id", nullable = false)
    private Utilisateur utilisateur;

    @Column(name = "login_date", nullable = false)
    private LocalDateTime loginDate;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "user_agent")
    private String userAgent;

    public LoginHistory(Utilisateur utilisateur, LocalDateTime loginDate, String ipAddress, String userAgent) {
        this.utilisateur = utilisateur;
        this.loginDate = loginDate;
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
    }
}
