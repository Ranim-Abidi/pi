package t.esprit.arctic.jobmatch.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.dto.CandidatureDTO;
import t.esprit.arctic.jobmatch.entity.Candidat;
import t.esprit.arctic.jobmatch.entity.Candidature;
import t.esprit.arctic.jobmatch.entity.Document;
import t.esprit.arctic.jobmatch.entity.OffreEmploi;
import t.esprit.arctic.jobmatch.repository.CandidatRepository;
import t.esprit.arctic.jobmatch.repository.CandidatureRepository;
import t.esprit.arctic.jobmatch.repository.OffreEmploiRepository;
import t.esprit.arctic.jobmatch.service.EmailService;

import java.util.*;
import java.util.stream.Collectors;
import java.time.LocalDateTime;
@RestController
@RequestMapping("/api/candidatures")
@RequiredArgsConstructor
public class CandidatureController {

    private final CandidatureRepository candidatureRepository;
    private final CandidatRepository candidatRepository;
    private final OffreEmploiRepository offreEmploiRepository;
    private final EmailService emailService;

    // ==================== EXISTANT: ADMIN ====================
    @GetMapping("/admin/toutes")
    public ResponseEntity<List<CandidatureDTO>> getAllCandidaturesForAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isAuthorized = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN")
                        || authority.getAuthority().equals("ROLE_RECRUTEUR"));

        if (!isAuthorized) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<CandidatureDTO> candidatures = candidatureRepository.findAllByOrderByDateEnvoiDesc()
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(candidatures);
    }

    // ==================== EXISTANT: CREATE ====================
    @PostMapping
    public ResponseEntity<?> creerCandidature(@Valid @RequestBody CandidatureDTO dto, BindingResult result) {
        System.out.println("=== REQUETE RECUE ===");
        System.out.println("DTO: " + dto);
        System.out.println("Has errors: " + result.hasErrors());

        if (result.hasErrors()) {
            Map<String, String> errors = new HashMap<>();
            result.getFieldErrors().forEach(error -> {
                System.out.println("Erreur field: " + error.getField() + " -> " + error.getDefaultMessage());
                errors.put(error.getField(), error.getDefaultMessage());
            });
            System.out.println("Erreurs retournées: " + errors);
            return ResponseEntity.badRequest().body(errors);
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        Candidat candidat = candidatRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        Candidature candidature = new Candidature();
        candidature.setDateEnvoi(LocalDateTime.now());
        candidature.setStatut("EN_ATTENTE");
        candidature.setCandidat(candidat);

        if (dto.getOffreId() != null) {
            OffreEmploi offre = offreEmploiRepository.findById(dto.getOffreId())
                    .orElseThrow(() -> new RuntimeException("Offre non trouvée avec ID: " + dto.getOffreId()));
            candidature.setOffreEmploi(offre);
            if (offre.getTitre() != null) {
                dto.setOffreTitre(offre.getTitre());
            }
        }

        candidature.setNomComplet(dto.getNomComplet());
        candidature.setEmail(dto.getEmail());
        candidature.setTelephone(dto.getTelephone());
        candidature.setDescription(dto.getDescription());
        candidature.setFormation(dto.getFormation());
        candidature.setExperience(dto.getExperience());
        candidature.setCompetences(dto.getCompetences());
        candidature.setLettreMotivation(dto.getLettreMotivation());
        candidature.setDateDisponibilite(dto.getDateDisponibilite());
        candidature.setPreavis(dto.getPreavis());
        candidature.setAcceptContact(dto.getAcceptContact());
        candidature.setAcceptRGPD(dto.isAcceptRGPD());

        Candidature saved = candidatureRepository.save(candidature);

        try {
            String emailCandidat = candidat.getEmail();
            String candidatNom = (candidat.getPrenom() != null ? candidat.getPrenom() : "") + " " + (candidat.getNom() != null ? candidat.getNom() : "");
            String posteNom = (saved.getOffreEmploi() != null && saved.getOffreEmploi().getTitre() != null)
                    ? saved.getOffreEmploi().getTitre()
                    : "l'offre";


            System.out.println(" Email de confirmation envoyé à: " + emailCandidat);

        } catch (Exception e) {
            System.out.println(" Erreur envoi email: " + e.getMessage());
            e.printStackTrace();
        }

        return new ResponseEntity<>(convertToDTO(saved), HttpStatus.CREATED);
    }

    // ==================== EXISTANT: READ - Mes candidatures ====================
    @GetMapping("/mes-candidatures")
    public ResponseEntity<List<CandidatureDTO>> getMesCandidatures() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        Candidat candidat = candidatRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        List<CandidatureDTO> candidatures = candidatureRepository.findByCandidatId(candidat.getId())
                .stream().map(this::convertToDTO).collect(Collectors.toList());

        return ResponseEntity.ok(candidatures);
    }

    // ==================== EXISTANT: READ - Statistiques ====================
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        Candidat candidat = candidatRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        List<Candidature> candidatures = candidatureRepository.findByCandidatId(candidat.getId());

        LocalDateTime now = LocalDateTime.now();
        int currentMonth = now.getMonthValue();
        int currentYear = now.getYear();

        long total = candidatures.size();
        long enAttente = candidatures.stream().filter(c -> "EN_ATTENTE".equals(c.getStatut())).count();
        long acceptees = candidatures.stream().filter(c -> "ACCEPTEE".equals(c.getStatut())).count();
        long refusees = candidatures.stream().filter(c -> "REFUSEE".equals(c.getStatut())).count();
        long entretiens = candidatures.stream().filter(c -> "ENTRETIEN".equals(c.getStatut())).count();

        long candidaturesCeMois = candidatures.stream().filter(c -> {
            if (c.getDateEnvoi() == null) return false;
            return c.getDateEnvoi().getMonthValue() == currentMonth &&
                    c.getDateEnvoi().getYear() == currentYear;
        }).count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("total", total);
        stats.put("enAttente", enAttente);
        stats.put("acceptees", acceptees);
        stats.put("refusees", refusees);
        stats.put("entretiens", entretiens);
        stats.put("candidaturesCeMois", candidaturesCeMois);

        return ResponseEntity.ok(stats);
    }
    // ==================== EXISTANT: READ - Candidatures par offre ====================
    @GetMapping("/offre/{offreId}")
    public ResponseEntity<List<CandidatureDTO>> getCandidaturesByOffre(@PathVariable Long offreId) {
        List<CandidatureDTO> candidatures = candidatureRepository.findByOffreEmploiId(offreId)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(candidatures);
    }

    // ==================== EXISTANT: READ - Filtrer par statut ====================
    @GetMapping("/filtre/statut/{statut}")
    public ResponseEntity<List<CandidatureDTO>> filtrerParStatut(@PathVariable String statut) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        Candidat candidat = candidatRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        List<CandidatureDTO> resultats = candidatureRepository.findByCandidatId(candidat.getId())
                .stream().filter(c -> c.getStatut().equals(statut))
                .map(this::convertToDTO).collect(Collectors.toList());

        return ResponseEntity.ok(resultats);
    }

    // ==================== EXISTANT: READ - Trier par date ====================
    @GetMapping("/tri/date")
    public ResponseEntity<List<CandidatureDTO>> trierParDate() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        Candidat candidat = candidatRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        List<CandidatureDTO> resultats = candidatureRepository.findByCandidatId(candidat.getId())
                .stream().sorted((c1, c2) -> c2.getDateEnvoi().compareTo(c1.getDateEnvoi()))
                .map(this::convertToDTO).collect(Collectors.toList());

        return ResponseEntity.ok(resultats);
    }

    // ==================== EXISTANT: READ - Recherche par entreprise ====================
    @GetMapping("/recherche")
    public ResponseEntity<List<CandidatureDTO>> rechercherParEntreprise(@RequestParam String entreprise) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        Candidat candidat = candidatRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        List<CandidatureDTO> resultats = candidatureRepository.findByCandidatId(candidat.getId())
                .stream().map(this::convertToDTO).collect(Collectors.toList());

        return ResponseEntity.ok(resultats);
    }

    // ==================== EXISTANT: READ - parID ====================
    @GetMapping("/{id}")
    public ResponseEntity<CandidatureDTO> getCandidatureById(@PathVariable Long id) {
        Candidature candidature = candidatureRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Candidature non trouvée"));

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        Candidat candidat = candidatRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        if (!candidature.getCandidat().getId().equals(candidat.getId())) {
            throw new RuntimeException("Vous n'avez pas accès à cette candidature");
        }

        return ResponseEntity.ok(convertToDTO(candidature));
    }

    // ==================== EXISTANT: UPDATE ====================
    @PutMapping("/{id}")
    public ResponseEntity<?> modifierCandidature(
            @PathVariable Long id,
            @Valid @RequestBody CandidatureDTO dto,
            BindingResult result) {

        if (result.hasErrors()) {
            Map<String, String> errors = new HashMap<>();
            result.getFieldErrors().forEach(error ->
                    errors.put(error.getField(), error.getDefaultMessage()));
            return ResponseEntity.badRequest().body(errors);
        }

        Candidature candidature = candidatureRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Candidature non trouvée avec ID: " + id));

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        Candidat candidat = candidatRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        if (!candidature.getCandidat().getId().equals(candidat.getId())) {
            throw new RuntimeException("Vous ne pouvez pas modifier cette candidature");
        }

        if (dto.getNomComplet() != null) candidature.setNomComplet(dto.getNomComplet());
        if (dto.getEmail() != null) candidature.setEmail(dto.getEmail());
        if (dto.getTelephone() != null) candidature.setTelephone(dto.getTelephone());
        if (dto.getDescription() != null) candidature.setDescription(dto.getDescription());
        if (dto.getFormation() != null) candidature.setFormation(dto.getFormation());
        if (dto.getExperience() != null) candidature.setExperience(dto.getExperience());
        if (dto.getCompetences() != null) candidature.setCompetences(dto.getCompetences());
        if (dto.getLettreMotivation() != null) candidature.setLettreMotivation(dto.getLettreMotivation());
        if (dto.getDateDisponibilite() != null) candidature.setDateDisponibilite(dto.getDateDisponibilite());
        if (dto.getPreavis() != null) candidature.setPreavis(dto.getPreavis());
        if (dto.getAcceptContact() != null) candidature.setAcceptContact(dto.getAcceptContact());
        candidature.setAcceptRGPD(dto.isAcceptRGPD());

        Candidature updated = candidatureRepository.save(candidature);
        return ResponseEntity.ok(convertToDTO(updated));
    }

    // ==================== EXISTANT: RECRUTEUR - Modifier statut ====================
    @PutMapping("/{id}/statut")
    public ResponseEntity<CandidatureDTO> modifierStatutCandidature(
            @PathVariable Long id,
            @RequestParam String statut) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isRecruteur = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_RECRUTEUR")
                        || a.getAuthority().equals("ROLE_ADMIN"));

        if (!isRecruteur) {
            throw new RuntimeException("Seul un recruteur peut modifier le statut");
        }

        Candidature candidature = candidatureRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Candidature non trouvée"));

        if (!statut.equals("ACCEPTEE") && !statut.equals("REFUSEE")) {
            throw new RuntimeException("Statut invalide. Valeurs acceptées: ACCEPTEE ou REFUSEE");
        }

        candidature.setStatut(statut);
        return ResponseEntity.ok(convertToDTO(candidatureRepository.save(candidature)));
    }

    // ==================== EXISTANT: DELETE ====================
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> supprimerCandidature(@PathVariable Long id) {
        Candidature candidature = candidatureRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Candidature non trouvée"));

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        Candidat candidat = candidatRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        if (!candidature.getCandidat().getId().equals(candidat.getId())) {
            throw new RuntimeException("Vous ne pouvez pas supprimer cette candidature");
        }

        candidatureRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== EXISTANT: QUICK APPLY ====================
    @PostMapping("/quick-apply")
    public ResponseEntity<?> quickApply(@RequestBody Map<String, Object> quickApplyData) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String email = authentication.getName();

            Candidat candidat = candidatRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

            Candidature candidature = new Candidature();
            candidature.setDateEnvoi(LocalDateTime.now());
            candidature.setStatut("EN_ATTENTE");
            candidature.setCandidat(candidat);
            candidature.setAcceptRGPD(true);

            OffreEmploi offre = null;
            if (quickApplyData.get("offreId") != null) {
                Long offreId = Long.valueOf(quickApplyData.get("offreId").toString());
                offre = offreEmploiRepository.findById(offreId)
                        .orElseThrow(() -> new RuntimeException("Offre non trouvée avec ID: " + offreId));
                candidature.setOffreEmploi(offre);
            }

            String nomComplet = candidat.getPrenom() != null
                    ? candidat.getPrenom() + " " + candidat.getNom()
                    : candidat.getNom() != null ? candidat.getNom() : "Candidat";

            candidature.setNomComplet(nomComplet);
            candidature.setEmail(candidat.getEmail());
            candidature.setTelephone("Non spécifié");

            if (offre != null) {
                String lettreGeneree = String.format(
                        "CANDIDATURE POUR L'OFFRE\n================================\n" +
                                "Poste : %s\nEntreprise : %s\nLocalisation : %s\n" +
                                "Type de contrat : %s\nSalaire : %s\n================================\n\n" +
                                "Description du poste :\n%s\n\nDate de candidature : %s\nStatut : En attente",
                        offre.getTitre() != null ? offre.getTitre() : "Non spécifié",
                        offre.getEntreprise() != null ? offre.getEntreprise() : "Non spécifiée",
                        offre.getLocation() != null ? offre.getLocation() : "Non spécifiée",
                        offre.getTypeContrat() != null ? offre.getTypeContrat() : "Non spécifié",
                        offre.getSalary() != null ? offre.getSalary() : "Non spécifié",
                        offre.getDescription() != null ? offre.getDescription() : "Aucune description",
                        new Date()
                );
                candidature.setLettreGeneree(lettreGeneree);
                candidature.setDescription("Candidature pour: " + offre.getTitre() + " chez " + offre.getEntreprise());
            } else {
                candidature.setLettreGeneree(quickApplyData.get("lettreGeneree").toString());
                candidature.setDescription("Candidature rapide");
            }

            Candidature saved = candidatureRepository.save(candidature);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Candidature envoyée avec succès");
            response.put("id", saved.getId());
            if (offre != null) {
                response.put("offreTitre", offre.getTitre());
                response.put("entreprise", offre.getEntreprise());
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "success", false));
        }
    }

    // ==================== EXISTANT: ALERTES ====================
    @GetMapping("/alertes")
    public ResponseEntity<List<Map<String, Object>>> getAlertes() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        Candidat candidat = candidatRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        List<Candidature> candidatures = candidatureRepository.findByCandidatId(candidat.getId());

        long total = candidatures.size();
        long enAttente = candidatures.stream().filter(c -> "EN_ATTENTE".equals(c.getStatut())).count();
        long acceptees = candidatures.stream().filter(c -> "ACCEPTEE".equals(c.getStatut())).count();
        long refusees = candidatures.stream().filter(c -> "REFUSEE".equals(c.getStatut())).count();

        List<Map<String, Object>> alertes = new ArrayList<>();

        if (enAttente > 5) {
            Map<String, Object> a = new HashMap<>();
            a.put("type", "warning");
            a.put("icon", "ri-alert-line");
            a.put("titre", "Candidatures en attente");
            a.put("message", "Vous avez " + enAttente + " candidatures en attente de réponse.");
            a.put("bouton", "Voir conseils");
            a.put("action", "relancer");
            alertes.add(a);
        }

        if (acceptees > 0) {
            Map<String, Object> a = new HashMap<>();
            a.put("type", "success");
            a.put("icon", "ri-checkbox-circle-line");
            a.put("titre", "Félicitations !");
            a.put("message", "Vous avez " + acceptees + " candidature(s) acceptée(s).");
            a.put("bouton", "Préparer entretien");
            a.put("action", "entretien");
            alertes.add(a);
        }

        if (total == 0) {
            Map<String, Object> a = new HashMap<>();
            a.put("type", "info");
            a.put("icon", "ri-lightbulb-line");
            a.put("titre", "Commencez votre recherche");
            a.put("message", "Découvrez les offres qui correspondent à vos compétences.");
            a.put("bouton", "Voir les offres");
            a.put("action", "offres");
            alertes.add(a);
        }

        if (refusees > 2) {
            Map<String, Object> a = new HashMap<>();
            a.put("type", "info");
            a.put("icon", "ri-question-line");
            a.put("titre", "Besoin d'aide ?");
            a.put("message", "Plusieurs candidatures refusées. Conseils pour améliorer votre CV.");
            a.put("bouton", "Améliorer mon CV");
            a.put("action", "cv");
            alertes.add(a);
        }

        return ResponseEntity.ok(alertes);
    }

    // ==================== EXISTANT: DOUBLONS ====================
    @GetMapping("/doublons")
    public ResponseEntity<List<List<CandidatureDTO>>> getDoublons() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        Candidat candidat = candidatRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        List<Candidature> candidatures = candidatureRepository.findByCandidatId(candidat.getId());

        Map<String, List<Candidature>> emailCount = new HashMap<>();
        candidatures.forEach(c -> {
            if (c.getEmail() != null && !c.getEmail().isEmpty()) {
                String emailKey = c.getEmail().toLowerCase().trim();
                emailCount.computeIfAbsent(emailKey, k -> new ArrayList<>()).add(c);
            }
        });

        List<List<CandidatureDTO>> doublons = emailCount.values().stream()
                .filter(group -> group.size() > 1)
                .map(group -> group.stream().map(this::convertToDTO).collect(Collectors.toList()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(doublons);
    }

    // ==================== EXISTANT: ANALYSE PROFIL ====================
    @GetMapping("/analyse-profil")
    public ResponseEntity<Map<String, Object>> getAnalyseProfil() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        Candidat candidat = candidatRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        List<Candidature> candidatures = candidatureRepository.findByCandidatId(candidat.getId());

        boolean aCompetences = candidatures.stream()
                .anyMatch(c -> c.getCompetences() != null && !c.getCompetences().isEmpty());
        boolean aExperience = candidatures.stream()
                .anyMatch(c -> c.getExperience() != null && !c.getExperience().isEmpty());
        boolean aCV = candidatures.stream().anyMatch(c -> c.getDocument() != null);

        int score = 0;
        List<String> conseils = new ArrayList<>();

        if (aCompetences) score += 35;
        else conseils.add("Ajoutez vos compétences clés");

        if (aExperience) score += 35;
        else conseils.add("Renseignez votre expérience professionnelle");

        if (aCV) score += 30;
        else conseils.add("Téléchargez votre CV");

        Map<String, Object> result = new HashMap<>();
        result.put("scoreProfil", score);
        result.put("conseils", conseils);
        result.put("profilCompetences", aCompetences);
        result.put("profilExperience", aExperience);
        result.put("profilCV", aCV);

        return ResponseEntity.ok(result);
    }

    // ==================== EXISTANT: TAUX REUSSITE ====================
    @GetMapping("/taux-reussite")
    public ResponseEntity<Map<String, Object>> getTauxReussite() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        Candidat candidat = candidatRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        List<Candidature> candidatures = candidatureRepository.findByCandidatId(candidat.getId());

        long total = candidatures.size();
        long acceptees = candidatures.stream().filter(c -> "ACCEPTEE".equals(c.getStatut())).count();
        long refusees = candidatures.stream().filter(c -> "REFUSEE".equals(c.getStatut())).count();
        long enAttente = candidatures.stream().filter(c -> "EN_ATTENTE".equals(c.getStatut())).count();

        double tauxReussite = total > 0 ? (double) acceptees / total * 100 : 0;
        double tauxRefus = total > 0 ? (double) refusees / total * 100 : 0;

        Map<String, Object> result = new HashMap<>();
        result.put("total", total);
        result.put("acceptees", acceptees);
        result.put("refusees", refusees);
        result.put("enAttente", enAttente);
        result.put("tauxReussite", Math.round(tauxReussite));
        result.put("tauxRefus", Math.round(tauxRefus));

        return ResponseEntity.ok(result);
    }

    // ==================== EXISTANT: STATS PAR MOIS ====================
    @GetMapping("/stats-par-mois")
    public ResponseEntity<List<Map<String, Object>>> getStatsParMois() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        Candidat candidat = candidatRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        List<Candidature> candidatures = candidatureRepository.findByCandidatId(candidat.getId());

        String[] mois = {"Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"};
        int[] compteur = new int[12];

        candidatures.forEach(c -> {
            if (c.getDateEnvoi() != null) {
                int month = c.getDateEnvoi().getMonthValue() - 1; // LocalDateTime retourne 1-12, Calendar attend 0-11
                compteur[month]++;
            }
        });

        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            Map<String, Object> m = new HashMap<>();
            m.put("mois", mois[i]);
            m.put("count", compteur[i]);
            result.add(m);
        }

        return ResponseEntity.ok(result);
    }

    // ==================== EXISTANT: SMART MATCH ====================
    @GetMapping("/smart-match")
    public ResponseEntity<List<Map<String, Object>>> getSmartMatch() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        Candidat candidat = candidatRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        List<Candidature> mesCandidatures = candidatureRepository.findByCandidatId(candidat.getId());
        Set<String> mesCompetences = new HashSet<>();
        mesCandidatures.forEach(c -> {
            if (c.getCompetences() != null) {
                Arrays.stream(c.getCompetences().split(","))
                        .map(String::trim)
                        .map(String::toLowerCase)
                        .forEach(mesCompetences::add);
            }
        });

        List<OffreEmploi> offres = offreEmploiRepository.findAll();

        List<Map<String, Object>> result = offres.stream().map(offre -> {
                    String descOffre = ((offre.getDescription() != null ? offre.getDescription() : "") + " " +
                            (offre.getTitre() != null ? offre.getTitre() : "")).toLowerCase();

                    long matches = mesCompetences.stream()
                            .filter(comp -> descOffre.contains(comp))
                            .count();

                    int score = mesCompetences.size() > 0
                            ? (int) Math.min((matches * 100) / mesCompetences.size(), 99)
                            : 30;

                    String label = score >= 70 ? "Excellent match" : score >= 40 ? "Bon match" : "Match partiel";

                    Map<String, Object> m = new HashMap<>();
                    m.put("offreId", offre.getId());
                    m.put("titrOffre", offre.getTitre());
                    m.put("entreprise", offre.getEntreprise());
                    m.put("localisation", offre.getLocation());
                    m.put("score", score);
                    m.put("label", label);
                    m.put("typeContrat", offre.getTypeContrat());
                    m.put("salary", offre.getSalary());
                    return m;
                })
                .sorted((a, b) -> (int) b.get("score") - (int) a.get("score"))
                .limit(10)
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // ==================== EXISTANT: RADAR COMPETENCES ====================
    @GetMapping("/radar-competences")
    public ResponseEntity<Map<String, Object>> getRadarCompetences() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        Candidat candidat = candidatRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        List<Candidature> candidatures = candidatureRepository.findByCandidatId(candidat.getId());

        Set<String> competences = new HashSet<>();
        candidatures.forEach(c -> {
            if (c.getCompetences() != null) {
                Arrays.stream(c.getCompetences().split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .forEach(competences::add);
            }
        });

        long total = candidatures.size();
        long acceptees = candidatures.stream().filter(c -> "ACCEPTEE".equals(c.getStatut())).count();
        long avecExperience = candidatures.stream().filter(c -> c.getExperience() != null && !c.getExperience().isEmpty()).count();

        List<Map<String, Object>> radarData = new ArrayList<>();

        Map<String, Object> r1 = new HashMap<>();
        r1.put("label", "Compétences techniques");
        r1.put("valeur", Math.min(competences.size() * 15, 100));
        radarData.add(r1);

        Map<String, Object> r2 = new HashMap<>();
        r2.put("label", "Expérience");
        r2.put("valeur", avecExperience > 0 ? 75 : 20);
        radarData.add(r2);

        Map<String, Object> r3 = new HashMap<>();
        r3.put("label", "Candidatures");
        r3.put("valeur", Math.min(total * 10, 100));
        radarData.add(r3);

        Map<String, Object> r4 = new HashMap<>();
        r4.put("label", "Taux de succès");
        r4.put("valeur", total > 0 ? (int)((double) acceptees / total * 100) : 0);
        radarData.add(r4);

        Map<String, Object> result = new HashMap<>();
        result.put("radarData", radarData);
        result.put("competences", new ArrayList<>(competences));
        result.put("totalCompetences", competences.size());

        return ResponseEntity.ok(result);
    }

    // ==================== EXISTANT: PREDICTION SUCCES ====================
    @GetMapping("/prediction-succes")
    public ResponseEntity<Map<String, Object>> getPredictionSucces() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        Candidat candidat = candidatRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        List<Candidature> candidatures = candidatureRepository.findByCandidatId(candidat.getId());

        long total = candidatures.size();
        long acceptees = candidatures.stream().filter(c -> "ACCEPTEE".equals(c.getStatut())).count();

        int probabilite = 40;

        if (total > 0) probabilite += 10;
        if (total >= 5) probabilite += 10;
        if (acceptees > 0) probabilite += 15;

        boolean aDesCompetences = candidatures.stream()
                .anyMatch(c -> c.getCompetences() != null && !c.getCompetences().isEmpty());
        if (aDesCompetences) probabilite += 10;

        boolean aLettre = candidatures.stream()
                .anyMatch(c -> c.getLettreMotivation() != null && !c.getLettreMotivation().isEmpty());
        if (aLettre) probabilite += 10;

        probabilite = Math.min(probabilite, 95);

        List<String> pointsForts = new ArrayList<>();
        if (aDesCompetences) pointsForts.add("Compétences bien renseignées");
        if (aLettre) pointsForts.add("Lettre de motivation présente");
        if (acceptees > 0) pointsForts.add("Historique de succès");
        if (total >= 5) pointsForts.add("Candidature régulière");

        List<String> pointsAmeliorer = new ArrayList<>();
        if (!aDesCompetences) pointsAmeliorer.add("Ajoutez vos compétences");
        if (!aLettre) pointsAmeliorer.add("Rédigez une lettre de motivation");
        if (total < 3) pointsAmeliorer.add("Envoyez plus de candidatures");
        pointsAmeliorer.add("Personnalisez chaque candidature");

        String[] moments = {"Mardi matin", "Mercredi matin", "Lundi après-midi", "Jeudi matin"};
        String meilleurMoment = moments[(int)(Math.random() * moments.length)];

        Map<String, Object> result = new HashMap<>();
        result.put("probabilite", probabilite);
        result.put("meilleurMoment", meilleurMoment);
        result.put("pointsForts", pointsForts);
        result.put("pointsAmeliorer", pointsAmeliorer);

        return ResponseEntity.ok(result);
    }

    // ==================== EXISTANT: RELANCES INTELLIGENTES ====================
    @GetMapping("/relances")
    public ResponseEntity<List<Map<String, Object>>> getRelances() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        Candidat candidat = candidatRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        List<Candidature> candidatures = candidatureRepository
                .findByCandidatIdAndStatut(candidat.getId(), "EN_ATTENTE");

        List<Map<String, Object>> result = candidatures.stream().map(c -> {
                    long joursEcoules = 0;
                    if (c.getDateEnvoi() != null) {
                        joursEcoules = java.time.Duration.between(c.getDateEnvoi(), LocalDateTime.now()).toDays();
                    }

                    String urgence = joursEcoules > 14 ? "haute" : joursEcoules > 7 ? "moyenne" : "basse";

                    String messageRelance = String.format(
                            "Bonjour,\n\nJe me permets de vous relancer concernant ma candidature " +
                                    "pour le poste de %s envoyée le %s.\n\n" +
                                    "Je reste très motivé(e) par cette opportunité et disponible pour tout entretien.\n\n" +
                                    "Cordialement,\n%s",
                            c.getOffreEmploi() != null ? c.getOffreEmploi().getTitre() : "votre offre",
                            c.getDateEnvoi() != null ? new java.text.SimpleDateFormat("dd/MM/yyyy").format(c.getDateEnvoi()) : "récemment",
                            c.getNomComplet() != null ? c.getNomComplet() : "Le candidat"
                    );
                    String niveauRappel = joursEcoules > 21 ? "critique" : joursEcoules > 14 ? "urgent" : "normal";
                    String couleurRappel = joursEcoules > 21 ? "#ef4444" : joursEcoules > 14 ? "#f59e0b" : "#3b82f6";

                    Map<String, Object> m = new HashMap<>();
                    m.put("id", c.getId());
                    m.put("offreTitre", c.getOffreEmploi() != null ? c.getOffreEmploi().getTitre() : "Candidature spontanée");
                    m.put("dateEnvoi", c.getDateEnvoi());
                    m.put("joursEcoules", joursEcoules);
                    m.put("urgence", urgence);
                    m.put("messageRelance", messageRelance);
                    m.put("niveauRappel", niveauRappel);
                    m.put("couleurRappel", couleurRappel);
                    return m;
                })
                .sorted((a, b) -> Long.compare((long) b.get("joursEcoules"), (long) a.get("joursEcoules")))
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // ==================== EXISTANT: GAMIFICATION ====================
    @GetMapping("/gamification")
    public ResponseEntity<Map<String, Object>> getGamification() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        Candidat candidat = candidatRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        List<Candidature> candidatures = candidatureRepository.findByCandidatId(candidat.getId());

        long total = candidatures.size();
        long acceptees = candidatures.stream().filter(c -> "ACCEPTEE".equals(c.getStatut())).count();
        long refusees = candidatures.stream().filter(c -> "REFUSEE".equals(c.getStatut())).count();

        Calendar cal = Calendar.getInstance();
        int currentMonth = cal.get(Calendar.MONTH);
        int currentYear = cal.get(Calendar.YEAR);

        long candidaturesCeMois = candidatures.stream().filter(c -> {
            if (c.getDateEnvoi() == null) return false;
            return c.getDateEnvoi().getMonthValue() == currentMonth &&
                    c.getDateEnvoi().getYear() == currentYear;
        }).count();

        long accepteesCeMois = candidatures.stream().filter(c -> {
            if (c.getDateEnvoi() == null) return false;
            return "ACCEPTEE".equals(c.getStatut()) &&
                    c.getDateEnvoi().getMonthValue() == currentMonth &&
                    c.getDateEnvoi().getYear() == currentYear;
        }).count();

        Set<String> competences = new HashSet<>();
        candidatures.forEach(c -> {
            if (c.getCompetences() != null) {
                Arrays.stream(c.getCompetences().split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .forEach(competences::add);
            }
        });

        int points = 0;
        points += Math.min(total * 8, 200);
        points += (int)(acceptees * 60);

        double tauxReussite = total > 0 ? (double) acceptees / total * 100 : 0;
        if (tauxReussite >= 50) points += 50;
        else if (tauxReussite >= 25) points += 25;
        else if (tauxReussite > 0) points += 10;

        points += Math.min(candidaturesCeMois * 10, 50);
        points += accepteesCeMois * 30;
        points += Math.min(competences.size() * 5, 50);

        if (refusees > 0 && acceptees > 0) points += 20;
        if (total >= 20) points += 30;

        boolean aCV = candidatures.stream().anyMatch(c -> c.getDocument() != null);
        boolean aLettre = candidatures.stream().anyMatch(c -> c.getLettreMotivation() != null && !c.getLettreMotivation().isEmpty());
        if (aCV) points += 30;
        if (aLettre) points += 20;

        String niveau;
        String niveauSuivant;
        int niveauProgress;
        int pointsPourNiveauSuivant;

        if (points < 100) {
            niveau = "Débutant";
            niveauSuivant = "Apprenti";
            niveauProgress = (int)(points * 100 / 100);
            pointsPourNiveauSuivant = 100 - points;
        } else if (points < 250) {
            niveau = "Apprenti";
            niveauSuivant = "Intermédiaire";
            niveauProgress = (int)((points - 100) * 100 / 150);
            pointsPourNiveauSuivant = 250 - points;
        } else if (points < 450) {
            niveau = "Intermédiaire";
            niveauSuivant = "Confirmé";
            niveauProgress = (int)((points - 250) * 100 / 200);
            pointsPourNiveauSuivant = 450 - points;
        } else if (points < 700) {
            niveau = "Confirmé";
            niveauSuivant = "Expert";
            niveauProgress = (int)((points - 450) * 100 / 250);
            pointsPourNiveauSuivant = 700 - points;
        } else if (points < 1000) {
            niveau = "Expert";
            niveauSuivant = "Légende";
            niveauProgress = (int)((points - 700) * 100 / 300);
            pointsPourNiveauSuivant = 1000 - points;
        } else {
            niveau = "Légende";
            niveauSuivant = "Maximum !";
            niveauProgress = 100;
            pointsPourNiveauSuivant = 0;
        }

        List<Map<String, Object>> badges = new ArrayList<>();
        addBadge(badges, "🌱", "Premier pas", "Première candidature", total >= 1);
        addBadge(badges, "📊", "Actif", "5 candidatures", total >= 5);
        addBadge(badges, "🎯", "En mission", "10 candidatures", total >= 10);
        addBadge(badges, "💪", "Persévérant", "20 candidatures", total >= 20);
        addBadge(badges, "🏆", "Premier succès", "1ère acceptation", acceptees >= 1);
        addBadge(badges, "🔥", "En demande", "3 acceptations", acceptees >= 3);
        addBadge(badges, "⭐", "Star", "5 acceptations", acceptees >= 5);
        if (tauxReussite >= 50) addBadge(badges, "🎯", "Précis", "Taux réussite > 50%", true);
        if (tauxReussite >= 75) addBadge(badges, "⚡", "Elite", "Taux réussite > 75%", true);
        addBadge(badges, "📅", "Régulier", "3 candidatures ce mois", candidaturesCeMois >= 3);
        addBadge(badges, "🌊", "En feu", "5 candidatures ce mois", candidaturesCeMois >= 5);
        if (competences.size() >= 5) addBadge(badges, "🧠", "Polyvalent", "5+ compétences", true);
        if (competences.size() >= 10) addBadge(badges, "🎓", "Expert", "10+ compétences", true);
        if (aCV && aLettre) addBadge(badges, "✅", "Prêt", "CV + Lettre", true);
        if (accepteesCeMois >= 1) addBadge(badges, "⚡", "En forme", "Acceptation ce mois", true);

        Map<String, Object> result = new HashMap<>();
        result.put("points", points);
        result.put("niveau", niveau);
        result.put("niveauSuivant", niveauSuivant);
        result.put("niveauProgress", niveauProgress);
        result.put("pointsPourNiveauSuivant", pointsPourNiveauSuivant);
        result.put("badges", badges);
        result.put("candidaturesCeMois", candidaturesCeMois);
        result.put("tauxReussite", Math.round(tauxReussite));
        result.put("competencesCount", competences.size());

        Map<String, Integer> details = new HashMap<>();
        details.put("base", (int)(total * 8));
        details.put("succes", (int)(acceptees * 60));
        details.put("tauxReussiteBonus", tauxReussite >= 50 ? 50 : (tauxReussite >= 25 ? 25 : 0));
        details.put("regularite", (int)Math.min(candidaturesCeMois * 10, 50));
        details.put("competences", Math.min(competences.size() * 5, 50));
        details.put("cv", aCV ? 30 : 0);
        details.put("lettre", aLettre ? 20 : 0);
        result.put("detailsPoints", details);

        return ResponseEntity.ok(result);
    }

    private void addBadge(List<Map<String, Object>> badges, String icon, String nom, String desc, boolean obtenu) {
        Map<String, Object> badge = new HashMap<>();
        badge.put("icon", icon);
        badge.put("nom", nom);
        badge.put("desc", desc);
        badge.put("obtenu", obtenu);
        badges.add(badge);
    }

    // ==================== EXISTANT: TIMELINE ====================
    @GetMapping("/timeline")
    public ResponseEntity<List<Map<String, Object>>> getTimeline() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        Candidat candidat = candidatRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        List<Candidature> candidatures = candidatureRepository.findByCandidatId(candidat.getId());

        List<Map<String, Object>> result = candidatures.stream()
                .sorted((a, b) -> b.getDateEnvoi().compareTo(a.getDateEnvoi()))
                .map(c -> {
                    String icon = "ACCEPTEE".equals(c.getStatut()) ? "🏆" :
                            "REFUSEE".equals(c.getStatut()) ? "❌" : "⏳";
                    String couleur = "ACCEPTEE".equals(c.getStatut()) ? "#10b981" :
                            "REFUSEE".equals(c.getStatut()) ? "#ef4444" : "#f59e0b";

                    Map<String, Object> m = new HashMap<>();
                    m.put("id", c.getId());
                    m.put("nomComplet", c.getNomComplet());
                    m.put("statut", c.getStatut());
                    m.put("dateEnvoi", c.getDateEnvoi());
                    m.put("offreTitre", c.getOffreEmploi() != null ? c.getOffreEmploi().getTitre() : "Candidature spontanée");
                    m.put("icon", icon);
                    m.put("couleur", couleur);
                    return m;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // JOIN

    // Candidatures par nom du candidat (JOIN Candidature + Candidat)

    @GetMapping("/jpql/par-nom-candidat")
    public ResponseEntity<List<Map<String, Object>>> getCandidaturesByCandidatNom(@RequestParam String nom) {
        List<Object[]> results = candidatureRepository.findCandidaturesByCandidatNom(nom);
        List<Map<String, Object>> response = new ArrayList<>();

        for (Object[] row : results) {
            Candidature c = (Candidature) row[0];
            Candidat ca = (Candidat) row[1];

            Map<String, Object> map = new HashMap<>();
            map.put("candidatureId", c.getId());
            map.put("statut", c.getStatut());
            map.put("dateEnvoi", c.getDateEnvoi());
            map.put("candidatId", ca.getId());
            map.put("candidatNom", ca.getNom());
            map.put("candidatPrenom", ca.getPrenom());
            map.put("candidatEmail", ca.getEmail());
            response.add(map);
        }
        return ResponseEntity.ok(response);
    }

    // Candidatures par entreprise (JOIN Candidature + OffreEmploi)

    @GetMapping("/jpql/par-entreprise")
    public ResponseEntity<List<Map<String, Object>>> getCandidaturesByOffreEntreprise(@RequestParam String entreprise) {
        List<Object[]> results = candidatureRepository.findCandidaturesByOffreEntreprise(entreprise);
        List<Map<String, Object>> response = new ArrayList<>();

        for (Object[] row : results) {
            Candidature c = (Candidature) row[0];
            OffreEmploi o = (OffreEmploi) row[1];

            Map<String, Object> map = new HashMap<>();
            map.put("candidatureId", c.getId());
            map.put("statut", c.getStatut());
            map.put("dateEnvoi", c.getDateEnvoi());
            map.put("offreTitre", o.getTitre());
            map.put("offreEntreprise", o.getEntreprise());
            map.put("offreSalary", o.getSalary());
            response.add(map);
        }
        return ResponseEntity.ok(response);
    }

   //Candidatures qui ont un document (JOIN Candidature + Document)

    @GetMapping("/jpql/avec-document-type")
    public ResponseEntity<List<Map<String, Object>>> getCandidaturesByDocumentType(@RequestParam String type) {
        List<Object[]> results = candidatureRepository.findCandidaturesByDocumentType(type);
        List<Map<String, Object>> response = new ArrayList<>();

        for (Object[] row : results) {
            Candidature c = (Candidature) row[0];
            Document d = (Document) row[1];

            Map<String, Object> map = new HashMap<>();
            map.put("candidatureId", c.getId());
            map.put("statut", c.getStatut());
            map.put("candidatNom", c.getNomComplet());
            map.put("documentId", d.getId());
            map.put("documentNom", d.getNom());
            map.put("documentScoreATS", d.getScoreATS());
            response.add(map);
        }
        return ResponseEntity.ok(response);
    }

 //Candidatures complètes par statut (JOIN 3 tables)

    @GetMapping("/jpql/complet-par-statut")
    public ResponseEntity<List<Map<String, Object>>> getFullCandidaturesByStatut(@RequestParam String statut) {
        List<Object[]> results = candidatureRepository.findFullCandidaturesByStatut(statut);
        List<Map<String, Object>> response = new ArrayList<>();

        for (Object[] row : results) {
            Candidature c = (Candidature) row[0];
            Candidat ca = (Candidat) row[1];
            OffreEmploi o = (OffreEmploi) row[2];

            Map<String, Object> map = new HashMap<>();
            map.put("candidatureId", c.getId());
            map.put("statut", c.getStatut());
            map.put("dateEnvoi", c.getDateEnvoi());
            map.put("candidatId", ca.getId());
            map.put("candidatNom", ca.getNom());
            map.put("candidatPrenom", ca.getPrenom());
            map.put("offreTitre", o.getTitre());
            map.put("offreEntreprise", o.getEntreprise());
            map.put("offreSalary", o.getSalary());
            response.add(map);
        }
        return ResponseEntity.ok(response);
    }

    //Toutes les candidatures avec LEFT JOIN document (pour admin)

    @GetMapping("/jpql/toutes-avec-left-join")
    public ResponseEntity<List<Map<String, Object>>> getAllCandidaturesWithLeftJoin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isAuthorized = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_RECRUTEUR"));

        if (!isAuthorized) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<Object[]> results = candidatureRepository.findAllCandidaturesWithLeftJoinDocument();
        List<Map<String, Object>> response = new ArrayList<>();

        for (Object[] row : results) {
            Candidature c = (Candidature) row[0];
            Candidat ca = (Candidat) row[1];
            Document d = (Document) row[2];

            Map<String, Object> map = new HashMap<>();
            map.put("candidatureId", c.getId());
            map.put("statut", c.getStatut());
            map.put("dateEnvoi", c.getDateEnvoi());
            map.put("candidatId", ca.getId());
            map.put("candidatNom", ca.getNom());
            map.put("candidatPrenom", ca.getPrenom());

            if (d != null) {
                map.put("documentId", d.getId());
                map.put("documentNom", d.getNom());
                map.put("documentScoreATS", d.getScoreATS());
            } else {
                map.put("documentId", null);
                map.put("documentNom", "Aucun document");
                map.put("documentScoreATS", null);
            }
            response.add(map);
        }
        return ResponseEntity.ok(response);
    }

   // Recherche multi-critères (JOIN 3 tables)

    @GetMapping("/jpql/recherche-multi")
    public ResponseEntity<List<Map<String, Object>>> getCandidaturesByEntrepriseAndStatut(
            @RequestParam String entreprise,
            @RequestParam String statut) {

        List<Object[]> results = candidatureRepository.findCandidaturesByEntrepriseAndStatut(entreprise, statut);
        List<Map<String, Object>> response = new ArrayList<>();

        for (Object[] row : results) {
            Candidature c = (Candidature) row[0];
            Candidat ca = (Candidat) row[1];
            OffreEmploi o = (OffreEmploi) row[2];

            Map<String, Object> map = new HashMap<>();
            map.put("candidatureId", c.getId());
            map.put("statut", c.getStatut());
            map.put("dateEnvoi", c.getDateEnvoi());
            map.put("candidatNom", ca.getNom());
            map.put("candidatPrenom", ca.getPrenom());
            map.put("offreTitre", o.getTitre());
            map.put("offreSalary", o.getSalary());
            response.add(map);
        }
        return ResponseEntity.ok(response);
    }

   //Statistiques par candidat (avec COUNT et GROUP BY)

    @GetMapping("/jpql/stats-par-candidat")
    public ResponseEntity<List<Map<String, Object>>> getStatsByCandidat() {
        List<Object[]> results = candidatureRepository.getStatsByCandidat();
        List<Map<String, Object>> response = new ArrayList<>();

        for (Object[] row : results) {
            Map<String, Object> map = new HashMap<>();
            map.put("candidatId", row[0]);
            map.put("candidatNom", row[1]);
            map.put("candidatPrenom", row[2]);
            map.put("totalCandidatures", row[3]);
            map.put("totalAcceptees", row[4]);

            long total = (Long) row[3];
            long acceptees = (Long) row[4];
            double taux = total > 0 ? (acceptees * 100.0 / total) : 0;
            map.put("tauxReussite", Math.round(taux));

            response.add(map);
        }
        return ResponseEntity.ok(response);
    }

    /**
     * Endpoint 8: Candidatures avec salaire minimum
     * URL: GET /api/candidatures/jpql/high-salary?minSalary=50000
     */
    @GetMapping("/jpql/high-salary")
    public ResponseEntity<List<Map<String, Object>>> getCandidaturesByMinSalary(@RequestParam Double minSalary) {
        List<Object[]> results = candidatureRepository.findCandidaturesByMinSalary(minSalary);
        List<Map<String, Object>> response = new ArrayList<>();

        for (Object[] row : results) {
            Candidature c = (Candidature) row[0];
            Candidat ca = (Candidat) row[1];
            OffreEmploi o = (OffreEmploi) row[2];

            Map<String, Object> map = new HashMap<>();
            map.put("candidatureId", c.getId());
            map.put("statut", c.getStatut());
            map.put("candidatNom", ca.getNom());
            map.put("candidatPrenom", ca.getPrenom());
            map.put("offreTitre", o.getTitre());
            map.put("offreEntreprise", o.getEntreprise());
            map.put("offreSalary", o.getSalary());
            response.add(map);
        }
        return ResponseEntity.ok(response);
    }

    // ==================== METHODE UTILITAIRE ====================
    private CandidatureDTO convertToDTO(Candidature c) {
        CandidatureDTO dto = new CandidatureDTO();
        dto.setId(c.getId());
        dto.setDateEnvoi(c.getDateEnvoi());
        dto.setStatut(c.getStatut());
        dto.setLettreGeneree(c.getLettreGeneree());
        dto.setNomComplet(c.getNomComplet());
        dto.setEmail(c.getEmail());
        dto.setTelephone(c.getTelephone());
        dto.setDescription(c.getDescription());
        dto.setFormation(c.getFormation());
        dto.setExperience(c.getExperience());
        dto.setCompetences(c.getCompetences());
        dto.setLettreMotivation(c.getLettreMotivation());
        dto.setDateDisponibilite(c.getDateDisponibilite());
        dto.setPreavis(c.getPreavis());
        dto.setAcceptContact(c.getAcceptContact());
        dto.setAcceptRGPD(c.getAcceptRGPD());
        dto.setScoreEntretien(c.getScoreEntretien());
        dto.setTotalQuestionsEntretien(c.getTotalQuestionsEntretien());
        dto.setBonnesReponsesEntretien(c.getBonnesReponsesEntretien());

        String statutLabel = switch (c.getStatut()) {
            case "EN_ATTENTE" -> "En attente";
            case "ACCEPTEE" -> "Acceptée";
            case "REFUSEE" -> "Refusée";
            default -> c.getStatut();
        };

        String statutClass = switch (c.getStatut()) {
            case "EN_ATTENTE" -> "pending";
            case "ACCEPTEE" -> "accepted";
            case "REFUSEE" -> "rejected";
            default -> "";
        };

        dto.setStatutLabel(statutLabel);
        dto.setStatutClass(statutClass);

        if (c.getCandidat() != null) {
            dto.setCandidatId(c.getCandidat().getId());
            dto.setCandidatNom(c.getCandidat().getNom());
        }

        if (c.getDocument() != null) {
            dto.setDocumentId(c.getDocument().getId());
            dto.setDocumentType(c.getDocument().getType().toString());
        }

        if (c.getOffreEmploi() != null) {
            dto.setOffreId(c.getOffreEmploi().getId());
            dto.setOffreTitre(c.getOffreEmploi().getTitre());
            dto.setEntreprise(c.getOffreEmploi().getEntreprise());
            dto.setPoste(c.getOffreEmploi().getTitre());
        }

        return dto;
    }
}
