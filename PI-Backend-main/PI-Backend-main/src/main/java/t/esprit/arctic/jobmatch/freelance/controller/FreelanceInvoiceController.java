package t.esprit.arctic.jobmatch.freelance.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.freelance.dto.FreelanceInvoiceDTO;
import t.esprit.arctic.jobmatch.freelance.service.FreelanceInvoiceService;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/freelance/invoices")
@RequiredArgsConstructor
public class FreelanceInvoiceController {
    private final FreelanceInvoiceService invoiceService;

    @GetMapping
    public ResponseEntity<List<FreelanceInvoiceDTO>> myInvoices(Principal principal) {
        return ResponseEntity.ok(invoiceService.getMyInvoices(principal.getName()));
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> invoicePdf(@PathVariable Long id, Principal principal) {
        byte[] pdf = invoiceService.generateInvoicePdf(id, principal.getName());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=invoice-" + id + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
