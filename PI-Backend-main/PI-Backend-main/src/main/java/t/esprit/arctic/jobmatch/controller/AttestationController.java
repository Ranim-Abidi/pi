package t.esprit.arctic.jobmatch.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.scheduler.AttestationScheduler;

import java.io.File;

@RestController
@RequestMapping("/api/attestation")
@RequiredArgsConstructor
public class AttestationController {

    @Value("${app.certificates.storage-path:./certificates}")
    private String storagePath;
    private final AttestationScheduler attestationScheduler;

    @PostMapping("/generer-maintenant")
    public ResponseEntity<String> forcerGeneration() {
        attestationScheduler.genererCertificats();
        return ResponseEntity.ok("Génération lancée, vérifie les logs");
    }
    @GetMapping("/{filename}")
    public ResponseEntity<Resource> telecharger(@PathVariable String filename) {
        File file = new File(storagePath + "/" + filename);
        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }
        Resource resource = new FileSystemResource(file);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + filename + "\"")
                .body(resource);
    }
}