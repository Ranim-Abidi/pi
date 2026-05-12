package t.esprit.arctic.jobmatch.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import t.esprit.arctic.jobmatch.dto.EntretienDTO;
import t.esprit.arctic.jobmatch.dto.EntretienTestPublicDto;
import t.esprit.arctic.jobmatch.entity.*;
import t.esprit.arctic.jobmatch.repository.*;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.Collection;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class EntretienService {

    @Autowired
    private EntretienRepository entretienRepository;

    @Autowired
    private CandidatRepository candidatRepository;

    @Autowired
    private RecruteurRepository recruteurRepository;

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private OffreEmploiRepository offreEmploiRepository;

    @Autowired
    private CandidatureRepository candidatureRepository;

    @Transactional
    public EntretienDTO createEntretien(EntretienDTO dto, Long recruteurId) {
        // Validation métier
        validateEntretienData(dto, recruteurId);

        Recruteur recruteur = recruteurRepository.findById(recruteurId)
                .orElseThrow(() -> new RuntimeException("Recruteur non trouvé"));

        Entretien entretien = new Entretien();
        entretien.setTitre(dto.getTitre());
        entretien.setDateEntretien(dto.getDateEntretien());
        entretien.setCategorie(CategorieEntretien.valueOf(dto.getType() != null ? dto.getType() : 
                                                         (dto.getCategorie() != null ? dto.getCategorie() : "TECHNIQUE")));
        entretien.setRecruteur(recruteur);
        entretien.setDescription(dto.getDescription());
        entretien.setPhoto(dto.getPhoto());
        entretien.setMode(normalizeMode(dto.getMode()));
        entretien.setMeetingLink(normalizeMeetingLink(dto.getMeetingLink()));
        entretien.setDureeMinutes(normalizeDurationMinutes(dto.getDureeMinutes()));

        boolean isTestType = "TEST".equalsIgnoreCase(dto.getType()) || "TEST".equalsIgnoreCase(dto.getCategorie());
        if (isTestType) {
            entretien.setSeuilReussite(null);
        } else {
            entretien.setSeuilReussite(dto.getSeuilReussite() != null ? dto.getSeuilReussite() : 70);
        }

        if (dto.getOffreId() != null) {
            OffreEmploi offre = offreEmploiRepository.findById(dto.getOffreId())
                    .orElseThrow(() -> new IllegalArgumentException("Offre non trouvée : " + dto.getOffreId()));
            entretien.setOffreEmploi(offre);
            entretien.setCandidat(null);
        } else if (!isTestType) {
            if (dto.getCandidatId() == null) {
                throw new IllegalArgumentException("Pour un entretien non TEST, un candidat ou une offre doit être sélectionné.");
            }
            Candidat candidat = candidatRepository.findById(dto.getCandidatId())
                    .orElseThrow(() -> new IllegalArgumentException("Candidat non trouvé : " + dto.getCandidatId()));
            entretien.setCandidat(candidat);
            entretien.setOffreEmploi(null);
        } else {
            entretien.setCandidat(null);
            entretien.setOffreEmploi(null);
        }

        if (dto.getDomaine() == null || dto.getDomaine().trim().isEmpty()) {
            throw new IllegalArgumentException("Le domaine de l'entretien est obligatoire");
        }
        entretien.setDomaine(DomaineType.fromString(dto.getDomaine()));
        entretien.setCompleted(false);

        Entretien saved = entretienRepository.save(entretien);
        return convertToDTO(saved);
    }

    public List<EntretienTestPublicDto> getPublicTestEntretiens() {
        return entretienRepository.findByCategorieAndCompleted(CategorieEntretien.TEST, false).stream()
                .sorted(Comparator.comparing(Entretien::getDateEntretien, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(this::toPublicTestDto)
                .collect(Collectors.toList());
    }

    private EntretienTestPublicDto toPublicTestDto(Entretien e) {
        EntretienTestPublicDto d = new EntretienTestPublicDto();
        d.setId(e.getId());
        d.setTitre(e.getTitre());
        d.setDescription(e.getDescription());
        if (e.getDomaine() != null) {
            d.setDomaine(e.getDomaine().name());
            d.setDomaineLabel(e.getDomaine().getLabel());
        }
        d.setDateEntretien(e.getDateEntretien());
        d.setPhoto(e.getPhoto());
        return d;
    }

    public List<EntretienDTO> getAllEntretiens() {
        return entretienRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<EntretienDTO> getEntretiensByRecruteur(Long recruteurId) {
        Recruteur recruteur = recruteurRepository.findById(recruteurId)
                .orElseThrow(() -> new RuntimeException("Recruteur non trouvé"));
        return entretienRepository.findByRecruteur(recruteur).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<EntretienDTO> getEntretiensByCandidat(Long candidatId) {
        Set<Long> offerIds = candidatureRepository.findByCandidatId(candidatId).stream()
            .map(Candidature::getOffreEmploi)
            .filter(java.util.Objects::nonNull)
            .map(OffreEmploi::getId)
            .collect(Collectors.toCollection(LinkedHashSet::new));

        Map<Long, Entretien> merged = new LinkedHashMap<>();
        List<Entretien> candidateEntretiens = entretienRepository.findByCandidatId(candidatId);
        candidateEntretiens.forEach(entretien -> merged.put(entretien.getId(), entretien));

        // Ne pas mélanger les entretiens d'une offre avec ceux d'autres candidats si
        // le candidat possède déjà ses propres entretiens.
        if (merged.isEmpty() && !offerIds.isEmpty()) {
            entretienRepository.findByOffreEmploiIdIn(offerIds).forEach(entretien -> merged.put(entretien.getId(), entretien));
        }

        return merged.values().stream()
            .sorted(Comparator.comparing(Entretien::getDateEntretien, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public EntretienDTO getEntretien(Long id) {
        return entretienRepository.findById(id)
                .map(this::convertToDTO)
                .orElse(null);
    }

    @Transactional
    public void markAsCompleted(Long id) {
        entretienRepository.findById(id).ifPresent(entretien -> {
            entretien.setCompleted(true);
            entretienRepository.save(entretien);
        });
    }

    @Transactional
    public EntretienDTO updateEntretien(Long id, EntretienDTO dto, Long recruteurId) {
        Entretien entretien = entretienRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Entretien non trouvé"));

        // Vérifier que le recruteur est propriétaire de l'entretien
        if (!entretien.getRecruteur().getId().equals(recruteurId)) {
            throw new RuntimeException("Accès non autorisé à cet entretien");
        }

        // Vérifier que l'entretien n'est pas déjà terminé
        if (entretien.isCompleted()) {
            throw new RuntimeException("Impossible de modifier un entretien terminé");
        }

        // Mettre à jour les champs
        if (dto.getTitre() != null && !dto.getTitre().trim().isEmpty()) {
            entretien.setTitre(dto.getTitre());
        }

        if (dto.getDateEntretien() != null) {
            // Vérifier que la date est dans le futur
            if (dto.getDateEntretien().isBefore(java.time.LocalDateTime.now())) {
                throw new IllegalArgumentException("La date de l'entretien doit être dans le futur");
            }
            entretien.setDateEntretien(dto.getDateEntretien());
        }

        if (dto.getDescription() != null) {
            entretien.setDescription(dto.getDescription());
        }

        if (dto.getPhoto() != null) {
            entretien.setPhoto(dto.getPhoto());
        }

        if (dto.getMode() != null && !dto.getMode().trim().isEmpty()) {
            entretien.setMode(normalizeMode(dto.getMode()));
        }

        if (dto.getMeetingLink() != null) {
            entretien.setMeetingLink(normalizeMeetingLink(dto.getMeetingLink()));
        }

        if (dto.getDureeMinutes() != null) {
            entretien.setDureeMinutes(normalizeDurationMinutes(dto.getDureeMinutes()));
        }

        boolean isTestType = "TEST".equalsIgnoreCase(dto.getType()) || "TEST".equalsIgnoreCase(dto.getCategorie());
        if (isTestType) {
            entretien.setSeuilReussite(null);
        } else if (dto.getSeuilReussite() != null) {
            entretien.setSeuilReussite(dto.getSeuilReussite());
        }

        if (dto.getDomaine() != null && !dto.getDomaine().trim().isEmpty()) {
            entretien.setDomaine(DomaineType.fromString(dto.getDomaine()));
        }

        // Gestion du candidat (seulement si ce n'est pas un TEST)
        if (!isTestType) {
            if (dto.getCandidatId() != null) {
                Candidat candidat = candidatRepository.findById(dto.getCandidatId())
                        .orElseThrow(() -> new IllegalArgumentException("Candidat non trouvé : " + dto.getCandidatId()));
                entretien.setCandidat(candidat);
            }
        } else {
            entretien.setCandidat(null);
        }

        Entretien saved = entretienRepository.save(entretien);
        return convertToDTO(saved);
    }

    @Transactional
    public void deleteEntretien(Long id, Long recruteurId) {
        Entretien entretien = entretienRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Entretien non trouvé"));

        // Vérifier que le recruteur est propriétaire de l'entretien
        if (!entretien.getRecruteur().getId().equals(recruteurId)) {
            throw new RuntimeException("Vous n'avez pas le droit de supprimer cet entretien");
        }

        // Allow deletion even if completed (for cleanup/management purposes)
        entretienRepository.delete(entretien);
    }

    @Transactional
    public EntretienDTO updateScore(Long entretienId, Double score) {
        return updateScore(entretienId, score, null, null);
    }

    @Transactional
    public EntretienDTO updateScore(Long entretienId, Double score, String commentaire) {
        return updateScore(entretienId, score, commentaire, null);
    }

    @Transactional
    public EntretienDTO updateScore(Long entretienId, Double score, String commentaire, String candidatEmail) {
        Entretien entretien = entretienRepository.findById(entretienId)
                .orElseThrow(() -> new RuntimeException("Entretien non trouvé"));

        if (score < 0 || score > 100) {
            throw new IllegalArgumentException("Le score doit être entre 0 et 100");
        }

        entretien.setScore(score);
        Integer seuil = entretien.getSeuilReussite();
        if (seuil == null) {
            entretien.setDecision(String.format(java.util.Locale.FRANCE, "Score : %.0f %% (test général)", score));
        } else {
            entretien.setDecision(score >= seuil ? "accepté" : "refusé");
        }
        entretien.setEvaluatedAt(LocalDateTime.now());
        if (commentaire != null && !commentaire.isBlank()) {
            entretien.setCommentaire(commentaire);
        }

        Entretien saved = entretienRepository.save(entretien);
        persistScoreOnCandidature(saved, score, candidatEmail);
        return convertToDTO(saved);
    }

    private void persistScoreOnCandidature(Entretien entretien, Double score, String candidatEmail) {
        Long candidatId = entretien.getCandidat() != null ? entretien.getCandidat().getId() : null;

        if ((candidatId == null || candidatId <= 0) && candidatEmail != null && !candidatEmail.isBlank()) {
            candidatId = candidatRepository.findByEmail(candidatEmail)
                    .map(Candidat::getId)
                    .orElse(null);
        }

        if (candidatId == null || candidatId <= 0) {
            return;
        }

        Candidature target = null;
        Long offreId = entretien.getOffreEmploi() != null ? entretien.getOffreEmploi().getId() : null;
        if (offreId != null && offreId > 0) {
           // target = candidatureRepository.findTopByCandidatIdAndOffreEmploiIdOrderByDateEnvoiDesc(candidatId, offreId)
             //       .orElse(null);
        }

        if (target == null) {
            List<Candidature> candidatures = candidatureRepository.findByCandidatId(candidatId);
            target = candidatures.stream()
                    .filter(c -> "ACCEPTEE".equalsIgnoreCase(String.valueOf(c.getStatut())))
                    .max(Comparator.comparing(Candidature::getDateEnvoi, Comparator.nullsLast(Comparator.naturalOrder())))
                    .orElseGet(() -> candidatures.stream()
                            .max(Comparator.comparing(Candidature::getDateEnvoi, Comparator.nullsLast(Comparator.naturalOrder())))
                            .orElse(null));
        }

        if (target == null) {
            return;
        }

        target.setScoreEntretien(score);
        if (entretien.getTotalQuestions() != null) {
            target.setTotalQuestionsEntretien(entretien.getTotalQuestions());
        }
        if (entretien.getBonnesReponses() != null) {
            target.setBonnesReponsesEntretien(entretien.getBonnesReponses());
        }
        target.setDateEvaluationEntretien(new Date());
        candidatureRepository.save(target);
    }

    private EntretienDTO convertToDTO(Entretien entretien) {
        EntretienDTO dto = new EntretienDTO();
        dto.setId(entretien.getId());
        dto.setTitre(entretien.getTitre());
        dto.setDateEntretien(entretien.getDateEntretien());
        dto.setType(entretien.getCategorie().toString());
        dto.setMode(entretien.getMode());
        dto.setDescription(entretien.getDescription());
        dto.setPhoto(entretien.getPhoto());
        dto.setMeetingLink(entretien.getMeetingLink());
        dto.setDomaine(entretien.getDomaine() != null ? entretien.getDomaine().name() : null);
        dto.setCompleted(entretien.isCompleted());
        dto.setSeuilReussite(entretien.getSeuilReussite());
        dto.setDureeMinutes(entretien.getDureeMinutes());
        dto.setCreatedAt(entretien.getCreatedAt());
        dto.setRecruteurId(entretien.getRecruteur().getId());
        dto.setCandidatId(entretien.getCandidat() != null ? entretien.getCandidat().getId() : null);
        dto.setOffreId(entretien.getOffreEmploi() != null ? entretien.getOffreEmploi().getId() : null);
        dto.setOffreTitre(entretien.getOffreEmploi() != null ? entretien.getOffreEmploi().getTitre() : null);
        dto.setScore(entretien.getScore());
        dto.setTotalQuestions(entretien.getTotalQuestions());
        dto.setBonnesReponses(entretien.getBonnesReponses());
        dto.setDecision(entretien.getDecision());
        dto.setCommentaire(entretien.getCommentaire());
        dto.setEvaluatedAt(entretien.getEvaluatedAt());
        // Les questions peuvent être ajoutées ici si besoin
        return dto;
    }

    private void validateEntretienData(EntretienDTO dto, Long recruteurId) {
        // Vérifier que le recruteur existe
        Recruteur recruteur = recruteurRepository.findById(recruteurId)
                .orElseThrow(() -> new RuntimeException("Recruteur non trouvé"));

        // Vérifier que la date est dans le futur
        if (dto.getDateEntretien() != null &&
            dto.getDateEntretien().isBefore(java.time.LocalDateTime.now())) {
            throw new IllegalArgumentException("La date de l'entretien doit être dans le futur");
        }

        // Vérifier la longueur du titre
        if (dto.getTitre() != null && dto.getTitre().length() > 255) {
            throw new IllegalArgumentException("Le titre ne peut pas dépasser 255 caractères");
        }

        // Vérifier la longueur de la description
        if (dto.getDescription() != null && dto.getDescription().length() > 1000) {
            throw new IllegalArgumentException("La description ne peut pas dépasser 1000 caractères");
        }

        // Validation spécifique selon le type
        String type = dto.getType() != null ? dto.getType() : dto.getCategorie();
        String mode = normalizeMode(dto.getMode());

        if ("VIDEO".equals(mode)) {
            String link = normalizeMeetingLink(dto.getMeetingLink());
            if (link == null || link.isBlank()) {
                throw new IllegalArgumentException("Le lien de réunion est obligatoire pour un entretien vidéo");
            }
            if (!link.toLowerCase().startsWith("http://") && !link.toLowerCase().startsWith("https://")) {
                throw new IllegalArgumentException("Le lien de réunion doit commencer par http:// ou https://");
            }
        }

        if (type != null && !"TEST".equalsIgnoreCase(type)) {
            if (dto.getCandidatId() == null && dto.getOffreId() == null) {
                throw new IllegalArgumentException("Un candidat ou une offre doit être sélectionné pour un entretien de type " + type);
            }
            if (dto.getCandidatId() != null) {
                // Vérifier que le candidat existe
                candidatRepository.findById(dto.getCandidatId())
                        .orElseThrow(() -> new IllegalArgumentException("Candidat non trouvé : " + dto.getCandidatId()));
            }
            if (dto.getOffreId() != null) {
                offreEmploiRepository.findById(dto.getOffreId())
                        .orElseThrow(() -> new IllegalArgumentException("Offre non trouvée : " + dto.getOffreId()));
            }
            if (dto.getSeuilReussite() == null) {
                throw new IllegalArgumentException("Le seuil de réussite est obligatoire pour ce type d'entretien");
            }
        }

        if (dto.getDureeMinutes() != null && (dto.getDureeMinutes() < 1 || dto.getDureeMinutes() > 300)) {
            throw new IllegalArgumentException("La duree de l'entretien doit etre comprise entre 1 et 300 minutes");
        }


    }

    private String normalizeMode(String mode) {
        String normalized = mode == null ? "QUESTIONS" : mode.trim().toUpperCase();
        if (!"VIDEO".equals(normalized) && !"QUESTIONS".equals(normalized)) {
            return "QUESTIONS";
        }
        return normalized;
    }

    private String normalizeMeetingLink(String link) {
        if (link == null) {
            return null;
        }
        String trimmed = link.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Integer normalizeDurationMinutes(Integer duration) {
        if (duration == null) {
            return 30;
        }
        if (duration < 1 || duration > 300) {
            throw new IllegalArgumentException("La duree de l'entretien doit etre comprise entre 1 et 300 minutes");
        }
        return duration;
    }
}
