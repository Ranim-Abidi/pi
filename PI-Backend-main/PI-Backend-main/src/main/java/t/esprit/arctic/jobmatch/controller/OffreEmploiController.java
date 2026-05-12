package t.esprit.arctic.jobmatch.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import t.esprit.arctic.jobmatch.dto.OffreEmploiPublicDto;
import t.esprit.arctic.jobmatch.dto.OffreEmploiRequestDTO;
import t.esprit.arctic.jobmatch.dto.OffreSalairePredictionRequestDTO;
import t.esprit.arctic.jobmatch.service.OffreEmploiReadService;
import t.esprit.arctic.jobmatch.service.OffreSalairePredictionService;
import t.esprit.arctic.jobmatch.entity.OffreEmploi;
import t.esprit.arctic.jobmatch.entity.Entretien;
import t.esprit.arctic.jobmatch.entity.Recruteur;
import t.esprit.arctic.jobmatch.repository.EntretienRepository;
import t.esprit.arctic.jobmatch.repository.OffreEmploiRepository;
import t.esprit.arctic.jobmatch.repository.RecruteurRepository;
import t.esprit.arctic.jobmatch.service.NotificationService;

import java.util.Date;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/offres-emploi")
@RequiredArgsConstructor
public class OffreEmploiController {

    private final OffreEmploiRepository offreEmploiRepository;
    private final OffreEmploiReadService offreEmploiReadService;
    private final EntretienRepository entretienRepository;
    private final RecruteurRepository recruteurRepository;
    private final NotificationService notificationService;
    private final OffreSalairePredictionService offreSalairePredictionService;
    @PostMapping("/predict-salary")
    public ResponseEntity<?> predictSalaire(@Valid @RequestBody OffreSalairePredictionRequestDTO dto) {
        String predictedSalary = offreSalairePredictionService.predictSalaire(
            dto.getTitre(),
            dto.getDescription(),
            dto.getEntreprise(),
            dto.getLocation(),
            dto.getTypeContrat(),
            dto.getCompetences()
        );
        return ResponseEntity.ok(Map.of("predicted_salary", predictedSalary));
    }

    @GetMapping
    public ResponseEntity<List<OffreEmploiPublicDto>> getAllOffres() {
        return ResponseEntity.ok(offreEmploiReadService.listPublicOffresSorted());
    }

    @GetMapping("/mes-offres")
    public ResponseEntity<List<OffreEmploi>> getMesOffres() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String identity = authentication.getName();
        if ("anonymousUser".equalsIgnoreCase(identity)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        List<OffreEmploi> offresParEmail = offreEmploiRepository
                .findByRecruteurEmailIgnoreCaseOrderByDatePublicationDesc(identity);
        if (!offresParEmail.isEmpty()) {
            return ResponseEntity.ok(offresParEmail);
        }

        return recruteurRepository.findByEmailIgnoreCase(identity)
                .map(recruteur -> {
                    List<OffreEmploi> offresParId = offreEmploiRepository
                            .findByRecruteurIdOrderByDatePublicationDesc(recruteur.getId());

                    if (!offresParId.isEmpty()) {
                        return ResponseEntity.ok(offresParId);
                    }

                    if (recruteur.getEntreprise() != null && !recruteur.getEntreprise().isBlank()) {
                        List<OffreEmploi> offresParEntreprise = offreEmploiRepository
                                .findByEntrepriseIgnoreCaseOrderByDatePublicationDesc(recruteur.getEntreprise());
                        if (!offresParEntreprise.isEmpty()) {
                            return ResponseEntity.ok(offresParEntreprise);
                        }
                    }

                    return ResponseEntity.ok(offresParId);
                })
                .orElseGet(() -> ResponseEntity.ok(List.of()));
    }

    @PostMapping
    public ResponseEntity<OffreEmploi> createOffre(@Valid @RequestBody OffreEmploiRequestDTO offrePayload) {
        Recruteur recruteur = getCurrentRecruteur();

        OffreEmploi offre = new OffreEmploi();
        applyPayloadToOffre(offre, offrePayload);
        offre.setDatePublication(new Date());
        offre.setRecruteur(recruteur);

        OffreEmploi savedOffre = offreEmploiRepository.save(offre);
        
        // Notify all followers of this recruiter about the new job
        notificationService.notifyFollowersOfNewJob(
            recruteur.getId(),
            recruteur.getNom(),
            offre.getTitre()
        );
        
        // Notify all candidates in the same location
        notificationService.notifyCandidatesByJobLocation(
            offre.getLocation(),
            offre.getTitre(),
            recruteur.getNom()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(savedOffre);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateOffre(@PathVariable Long id, @Valid @RequestBody OffreEmploiRequestDTO payload) {
        Recruteur recruteur = getCurrentRecruteur();
        OffreEmploi offre = offreEmploiRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Offre non trouvée"));

        if (offre.getRecruteur() == null || !offre.getRecruteur().getId().equals(recruteur.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Vous ne pouvez modifier que vos propres offres"));
        }

        applyPayloadToOffre(offre, payload);

        return ResponseEntity.ok(offreEmploiRepository.save(offre));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteOffre(@PathVariable Long id) {
        Recruteur recruteur = getCurrentRecruteur();
        OffreEmploi offre = offreEmploiRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Offre non trouvée"));

        if (offre.getRecruteur() == null || !offre.getRecruteur().getId().equals(recruteur.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Vous ne pouvez supprimer que vos propres offres"));
        }

        try {
            // Prevent FK violations: interviews keep history but no longer reference deleted offer.
            List<Entretien> linkedEntretiens = entretienRepository.findByOffreEmploiId(id);
            if (!linkedEntretiens.isEmpty()) {
                linkedEntretiens.forEach(entretien -> entretien.setOffreEmploi(null));
                entretienRepository.saveAll(linkedEntretiens);
            }

            offreEmploiRepository.delete(offre);
            return ResponseEntity.noContent().build();
        } catch (DataIntegrityViolationException ex) {
            // Last-resort fallback: mark offer inactive instead of crashing with 500.
            offre.setStatut("INACTIVE");
            offreEmploiRepository.save(offre);
            return ResponseEntity.ok(Map.of(
                    "archived", true,
                    "message", "Offre archivée car des références existent"
            ));
        }
    }

    private Recruteur getCurrentRecruteur() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            throw new RuntimeException("Utilisateur non authentifie");
        }

        String email = authentication.getName();

        return recruteurRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("Recruteur non trouvé"));
    }

    private void applyPayloadToOffre(OffreEmploi offre, OffreEmploiRequestDTO payload) {
        offre.setTitre(payload.getTitre());
        offre.setDescription(payload.getDescription());
        offre.setEntreprise(payload.getEntreprise());
        offre.setLocation(payload.getLocation());
        offre.setSalary(payload.getSalary());
        offre.setTypeContrat(payload.getTypeContrat());
        offre.setDeadline(payload.getDeadline());
        offre.setCompetencesRequises(payload.getCompetencesRequises());
        offre.setImage(payload.getImage());
        offre.setStatut(payload.getStatut() != null ? payload.getStatut() : "ACTIVE");
    }
}
