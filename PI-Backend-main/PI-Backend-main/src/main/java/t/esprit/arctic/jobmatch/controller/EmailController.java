package t.esprit.arctic.jobmatch.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import t.esprit.arctic.jobmatch.service.EmailService;

@RestController
@RequestMapping("/api/email")
@RequiredArgsConstructor
public class EmailController {

    private final EmailService emailService;

    @PostMapping("/postuler")
    public ResponseEntity<String> postuler(
            @RequestParam("emailEntreprise") String emailEntreprise,

            @RequestParam("emailCandidat") String emailCandidat,
            @RequestParam("message") String message,
            @RequestParam("titreOffre") String titreOffre,
            @RequestParam(value = "cv", required = false) MultipartFile cv
    ) {
        try {
            emailService.envoyerCandidature(
                    emailEntreprise,

                    emailCandidat,
                    message,
                    titreOffre,
                    cv
            );
            return ResponseEntity.ok("✅ Email envoyé !");
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body("❌ Erreur : " + e.getMessage());
        }
    }
}
