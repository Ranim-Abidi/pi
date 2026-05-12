package t.esprit.arctic.jobmatch.freelance.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import t.esprit.arctic.jobmatch.entity.Utilisateur;
import t.esprit.arctic.jobmatch.freelance.entity.Mission;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
public class FreelanceContract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mission_id", nullable = false)
    private Mission mission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Utilisateur client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "freelancer_id", nullable = false)
    private Utilisateur freelancer;

    private Double amount;
    
    @Column(columnDefinition = "TEXT")
    private String terms;

    private Integer termsVersion = 1;

    @Column(columnDefinition = "TEXT")
    private String auditTrail;

    private String smartContractHash;
    
    private Double totalEscrow = 0.0;
    
    private Boolean clientAccepted = false;
    private Boolean freelancerAccepted = false;

    // ── Ratings (client ↔ freelancer) ──────────────────────────────────────
    // Client rates freelancer after contract completion.
    private Integer clientRating;
    private String clientRatingComment;

    // Freelancer rates client after contract completion.
    private Integer freelancerRating;
    private String freelancerRatingComment;

    @Column(columnDefinition = "LONGTEXT")
    private String clientSignature;

    @Column(columnDefinition = "LONGTEXT")
    private String freelancerSignature;

    @OneToMany(mappedBy = "contract", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FreelanceMilestone> milestones = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    private ContractStatus status = ContractStatus.PROPOSED;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
