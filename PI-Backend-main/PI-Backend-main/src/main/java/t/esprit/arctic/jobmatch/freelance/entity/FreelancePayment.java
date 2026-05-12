package t.esprit.arctic.jobmatch.freelance.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
public class FreelancePayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private FreelanceContract contract;

    private Double amount;

    private String method = "ESCROW_SIMULATION";

    @Enumerated(EnumType.STRING)
    private PaymentStatus status = PaymentStatus.ESCROWED;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime releasedAt;

}
