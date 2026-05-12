package t.esprit.arctic.jobmatch.freelance.service;

import com.itextpdf.text.Document;
import com.itextpdf.text.Element;
import com.itextpdf.text.PageSize;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import t.esprit.arctic.jobmatch.entity.Utilisateur;
import t.esprit.arctic.jobmatch.freelance.dto.FreelanceInvoiceDTO;
import t.esprit.arctic.jobmatch.freelance.entity.FreelanceContract;
import t.esprit.arctic.jobmatch.freelance.entity.FreelanceInvoice;
import t.esprit.arctic.jobmatch.freelance.entity.FreelancePayment;
import t.esprit.arctic.jobmatch.freelance.entity.InvoiceStatus;
import t.esprit.arctic.jobmatch.freelance.exception.FreelanceNotFoundException;
import t.esprit.arctic.jobmatch.freelance.repository.FreelanceInvoiceRepository;
import t.esprit.arctic.jobmatch.repository.UtilisateurRepository;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FreelanceInvoiceService {
    private final FreelanceInvoiceRepository invoiceRepository;
    private final UtilisateurRepository utilisateurRepository;

    @Transactional
    public FreelanceInvoice generateInvoiceFromPayment(FreelanceContract contract, FreelancePayment payment, Double vatRate) {
        FreelanceInvoice invoice = new FreelanceInvoice();
        invoice.setContract(contract);
        invoice.setPayment(payment);
        invoice.setClient(contract.getClient());
        invoice.setFreelancer(contract.getFreelancer());
        invoice.setInvoiceNumber("INV-" + LocalDateTime.now().getYear() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        double subtotal = payment.getAmount() == null ? 0.0 : payment.getAmount();
        double normalizedVat = vatRate == null ? 0.0 : Math.max(vatRate, 0.0);
        double vatAmount = subtotal * (normalizedVat / 100.0);
        invoice.setSubtotal(subtotal);
        invoice.setVatRate(normalizedVat);
        invoice.setVatAmount(vatAmount);
        invoice.setTotalAmount(subtotal + vatAmount);
        invoice.setStatus(InvoiceStatus.PAID);
        return invoiceRepository.save(invoice);
    }

    @Transactional(readOnly = true)
    public List<FreelanceInvoiceDTO> getMyInvoices(String email) {
        Utilisateur user = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new FreelanceNotFoundException("Utilisateur introuvable"));
        List<FreelanceInvoice> invoices = new ArrayList<>();
        invoices.addAll(invoiceRepository.findByClientIdOrderByCreatedAtDesc(user.getId()));
        invoices.addAll(invoiceRepository.findByFreelancerIdOrderByCreatedAtDesc(user.getId()));
        return invoices.stream().distinct().map(FreelanceInvoiceDTO::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public byte[] generateInvoicePdf(Long invoiceId, String email) {
        Utilisateur user = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new FreelanceNotFoundException("Utilisateur introuvable"));
        FreelanceInvoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new FreelanceNotFoundException("Facture introuvable"));
        if (!invoice.getClient().getId().equals(user.getId()) && !invoice.getFreelancer().getId().equals(user.getId())) {
            throw new FreelanceNotFoundException("Facture inaccessible");
        }
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4, 32, 32, 32, 32);
            PdfWriter.getInstance(document, baos);
            document.open();
            Paragraph title = new Paragraph("FACTURE " + invoice.getInvoiceNumber());
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);
            document.add(new Paragraph(" "));
            document.add(new Paragraph("Client: " + invoice.getClient().getNom()));
            document.add(new Paragraph("Freelancer: " + invoice.getFreelancer().getNom()));
            document.add(new Paragraph("Date: " + invoice.getCreatedAt()));
            document.add(new Paragraph(" "));
            document.add(new Paragraph("Sous-total: " + invoice.getSubtotal() + " TND"));
            document.add(new Paragraph("TVA (" + invoice.getVatRate() + "%): " + invoice.getVatAmount() + " TND"));
            document.add(new Paragraph("Total: " + invoice.getTotalAmount() + " TND"));
            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Erreur génération facture PDF: " + e.getMessage(), e);
        }
    }
}
