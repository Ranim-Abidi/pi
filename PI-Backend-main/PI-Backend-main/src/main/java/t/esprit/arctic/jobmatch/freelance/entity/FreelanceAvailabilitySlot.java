package t.esprit.arctic.jobmatch.freelance.entity;

import jakarta.persistence.*;
import lombok.*;
import t.esprit.arctic.jobmatch.entity.Utilisateur;

import java.time.LocalDateTime;

@Entity
@Table(name = "fl_availability_slots")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FreelanceAvailabilitySlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "freelancer_id", nullable = false)
    private Utilisateur freelancer;

    @Column(nullable = false)
    private LocalDateTime startDate;

    @Column(nullable = false)
    private LocalDateTime endDate;

    @Column(nullable = false)
    private boolean booked;

    private Long bookedByUserId;

    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
