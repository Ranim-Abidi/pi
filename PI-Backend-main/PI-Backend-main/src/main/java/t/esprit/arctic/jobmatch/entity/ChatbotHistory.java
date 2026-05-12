package t.esprit.arctic.jobmatch.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class ChatbotHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long candidatId;

    @Column(nullable = false)
    private Long formationId;

    @Column(columnDefinition = "TEXT")
    private String historiqueJson;

    @Column(nullable = true)
    private String sessionId;

    @Column(nullable = true)
    private String sessionTitle;

    @Column(nullable = true)
    private java.time.LocalDateTime createdAt;

}
