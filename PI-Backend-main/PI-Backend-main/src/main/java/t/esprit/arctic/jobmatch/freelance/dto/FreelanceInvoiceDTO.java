package t.esprit.arctic.jobmatch.freelance.dto;

import lombok.*;
import t.esprit.arctic.jobmatch.freelance.entity.FreelanceInvoice;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FreelanceInvoiceDTO {
    private Long id;
    private Long contractId;
    private Long paymentId;
    private String invoiceNumber;
    private Double subtotal;
    private Double vatRate;
    private Double vatAmount;
    private Double totalAmount;
    private String status;
    private String createdAt;

    public static FreelanceInvoiceDTO fromEntity(FreelanceInvoice invoice) {
        return FreelanceInvoiceDTO.builder()
                .id(invoice.getId())
                .contractId(invoice.getContract() != null ? invoice.getContract().getId() : null)
                .paymentId(invoice.getPayment() != null ? invoice.getPayment().getId() : null)
                .invoiceNumber(invoice.getInvoiceNumber())
                .subtotal(invoice.getSubtotal())
                .vatRate(invoice.getVatRate())
                .vatAmount(invoice.getVatAmount())
                .totalAmount(invoice.getTotalAmount())
                .status(invoice.getStatus() != null ? invoice.getStatus().name() : null)
                .createdAt(invoice.getCreatedAt() != null ? invoice.getCreatedAt().toString() : null)
                .build();
    }
}
