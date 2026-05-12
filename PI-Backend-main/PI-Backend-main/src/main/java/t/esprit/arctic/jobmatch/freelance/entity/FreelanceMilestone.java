package t.esprit.arctic.jobmatch.freelance.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
public class FreelanceMilestone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private FreelanceContract contract;

    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String description;

    private Double amount;

    private LocalDateTime dueDate;

    @Enumerated(EnumType.STRING)
    private MilestoneStatus status = MilestoneStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String submissionNote;

    @Column(columnDefinition = "TEXT")
    private String deliveryUrl;

    @Column(columnDefinition = "TEXT")
    private String clientFeedback;

    private LocalDateTime submittedAt;
    private LocalDateTime approvedAt;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
