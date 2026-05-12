package t.esprit.arctic.jobmatch.controller;


import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.entity.Certificat;
import t.esprit.arctic.jobmatch.service.CertificatService;
import t.esprit.arctic.jobmatch.repository.InscriptionFormationRepository;

import java.util.List;

@RestController
@RequestMapping("/api/certificats")
@RequiredArgsConstructor
public class CertificatController {

    private final CertificatService              certificatService;
    private final InscriptionFormationRepository inscriptionRepo;

    @GetMapping
    public ResponseEntity<List<Certificat>> getAll() {
        return ResponseEntity.ok(certificatService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Certificat> getById(@PathVariable Long id) {
        return ResponseEntity.ok(certificatService.getById(id));
    }

    @GetMapping("/candidat/{candidatId}")
    public ResponseEntity<List<Certificat>> getByCandidat(
            @PathVariable Long candidatId) {
        return ResponseEntity.ok(
                certificatService.getByCandidat(candidatId));
    }

    @PostMapping("/generer/{inscriptionId}")
    public ResponseEntity<?> genererDepuisInscription(
            @PathVariable Long inscriptionId) {
        return inscriptionRepo.findById(inscriptionId)
                .map(ins -> ResponseEntity.ok(certificatService.genererAutomatiquement(ins)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/telecharger")
    public ResponseEntity<byte[]> telecharger(@PathVariable Long id) {
        byte[] pdf = certificatService.genererPdf(id);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData(
                "attachment", "certificat-" + id + ".pdf");
        headers.setContentLength(pdf.length);
        return ResponseEntity.ok().headers(headers).body(pdf);
    }

    @GetMapping("/verify/{code}")
    public ResponseEntity<?> verifyCertificat(@PathVariable String code) {
        try {
            Certificat cert = certificatService.verifyByCode(code);
            return ResponseEntity.ok(cert);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
