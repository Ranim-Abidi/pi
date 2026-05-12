package t.esprit.arctic.jobmatch.freelance.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import t.esprit.arctic.jobmatch.entity.Utilisateur;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@Table(name = "fl_invoices")
public class FreelanceInvoice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private FreelanceContract contract;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id")
    private FreelancePayment payment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Utilisateur client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "freelancer_id", nullable = false)
    private Utilisateur freelancer;

    @Column(nullable = false, unique = true)
    private String invoiceNumber;

    private Double subtotal;
    private Double vatRate;
    private Double vatAmount;
    private Double totalAmount;

    @Enumerated(EnumType.STRING)
    private InvoiceStatus status = InvoiceStatus.GENERATED;

    private LocalDateTime createdAt = LocalDateTime.now();
}
