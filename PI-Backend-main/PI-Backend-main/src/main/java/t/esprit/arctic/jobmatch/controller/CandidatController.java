package t.esprit.arctic.jobmatch.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.hibernate.LazyInitializationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.entity.Candidat;
import t.esprit.arctic.jobmatch.entity.Competence;
import t.esprit.arctic.jobmatch.service.CandidatService;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLConnection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/candidats")
@RequiredArgsConstructor
public class CandidatController {

    private final CandidatService service;
    private static final Logger logger = LoggerFactory.getLogger(CandidatController.class);

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody Candidat candidat) {
        Candidat created = service.create(candidat);
        return ResponseEntity.status(HttpStatus.CREATED).body(toCandidateProfilePayload(created));
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll() {
        List<Map<String, Object>> payload = service.getAll().stream()
                .map(this::toCandidateProfilePayload)
                .toList();
        return ResponseEntity.ok(payload);
    }

    @GetMapping("/email/{email}")
    public ResponseEntity<?> getByEmail(@PathVariable String email) {
        Candidat candidat = service.findByEmail(email);
        return ResponseEntity.ok(toCandidateProfilePayload(candidat));
    }

    private Map<String, Object> toCandidateProfilePayload(Candidat candidat) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("id", candidat.getId());
        payload.put("nom", candidat.getNom());
        payload.put("email", candidat.getEmail());
        payload.put("prenom", candidat.getPrenom());
        payload.put("telephone", candidat.getTelephone());
        payload.put("description", candidat.getDescription());
        payload.put("cv", candidat.getCv());
        payload.put("cv_url", candidat.getCvUrl());
        payload.put("profile_picture_url", candidat.getProfilePictureUrl());
        payload.put("lienPortfolio", candidat.getLienPortfolio());
        payload.put("niveauEtude", candidat.getNiveauEtude());
        payload.put("backgroundExpertise", candidat.getBackgroundExpertise());
        payload.put("passionAndGoals", candidat.getPassionAndGoals());
        payload.put("localisation_id", candidat.getLocalisationId());

        payload.put("competences", extractCompetenceNames(candidat));

        return payload;
    }

    private List<String> extractCompetenceNames(Candidat candidat) {
        try {
            if (candidat.getCompetences() == null) {
                return List.of();
            }
            return candidat.getCompetences().stream()
                    .map(c -> c != null ? c.getNom() : null)
                    .filter(n -> n != null && !n.isBlank())
                    .collect(Collectors.toList());
        } catch (LazyInitializationException ex) {
            logger.warn("Competences non initialisées pour candidat {}. Retour d'une liste vide.", candidat.getId());
            return List.of();
        }
    }


    @GetMapping("/me")
    public ResponseEntity<?> getCurrentCandidat() {
        try {
            // Récupérer l'email de l'utilisateur connecté depuis Spring Security
            org.springframework.security.core.Authentication authentication =
                    org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();

            if (authentication == null || !authentication.isAuthenticated()) {
                logger.warn("No authenticated user found");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Utilisateur non authentifié"));
            }

            String email = authentication.getName();
            logger.info(" Fetching current candidat with email: {}", email);

            // Chercher le candidat par email
            Candidat candidat = service.findByEmail(email);

            if (candidat == null) {
                logger.warn("No candidate found with email: {}", email);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Candidat non trouvé avec email: " + email));
            }

            logger.info(" Candidat found: {} {}", candidat.getPrenom(), candidat.getNom());
            logger.info(" Description: {}", candidat.getDescription());

            return ResponseEntity.ok(toCandidateProfilePayload(candidat));

        } catch (Exception e) {
            logger.error(" Error fetching current candidat: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur serveur: " + e.getMessage()));
        }
    }


    @GetMapping("/{id}/download-cv")
    public ResponseEntity<?> downloadCV(@PathVariable Long id) {
        try {
            logger.info("=== CV Download Request for ID: {} ===", id);
            
            Candidat candidat = service.getById(id);
            logger.info("Candidate found: {} (ID: {})", candidat.getNom(), candidat.getId());
            
            if (candidat.getCvUrl() == null || candidat.getCvUrl().trim().isEmpty()) {
                logger.warn("CV URL is null or empty for candidate ID: {}", id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("CV not found for this candidate");
            }
            
            String cvUrl = candidat.getCvUrl().trim();
            logger.info("CV URL: {}", cvUrl);
            
            // Redirect to the Cloudinary URL with attachment header
            return ResponseEntity.ok()
                    .header(HttpHeaders.LOCATION, cvUrl)
                    .header(HttpHeaders.CONTENT_DISPOSITION, 
                            "attachment; filename=\"cv_" + candidat.getId() + ".pdf\"")
                    .build();
                    
        } catch (Exception e) {
            logger.error("Error downloading CV for ID: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        Candidat candidat = service.getById(id);
        return ResponseEntity.ok(toCandidateProfilePayload(candidat));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @Valid @RequestBody Candidat candidatDetails) {
        Candidat updated = service.update(id, candidatDetails);
        return ResponseEntity.ok(toCandidateProfilePayload(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/competences")
    public ResponseEntity<?> updateCompetences(
            @PathVariable Long id,
            @RequestBody Map<String, List<String>> payload) {
        List<String> competenceNames = payload.get("competences");
        if (competenceNames == null) {
            return ResponseEntity.badRequest().body("competences field is required");
        }
        Candidat updated = service.updateCompetencesFromStrings(id, competenceNames);
        return ResponseEntity.ok(toCandidateProfilePayload(updated));
    }
}


