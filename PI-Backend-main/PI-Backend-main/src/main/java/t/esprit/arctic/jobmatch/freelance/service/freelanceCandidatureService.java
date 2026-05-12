package t.esprit.arctic.jobmatch.freelance.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import t.esprit.arctic.jobmatch.entity.Utilisateur;
import t.esprit.arctic.jobmatch.freelance.dto.CandidatureRequestDTO;
import t.esprit.arctic.jobmatch.freelance.dto.CandidatureResponseDTO;
import t.esprit.arctic.jobmatch.freelance.entity.CandidatureMission;
import t.esprit.arctic.jobmatch.freelance.entity.CandidatureStatut;
import t.esprit.arctic.jobmatch.freelance.entity.Mission;
import t.esprit.arctic.jobmatch.freelance.entity.MissionStatut;
import t.esprit.arctic.jobmatch.freelance.exception.FreelanceAccessDeniedException;
import t.esprit.arctic.jobmatch.freelance.exception.FreelanceConflictException;
import t.esprit.arctic.jobmatch.freelance.exception.FreelanceNotFoundException;
import t.esprit.arctic.jobmatch.freelance.repository.CandidatureMissionRepository;
import t.esprit.arctic.jobmatch.freelance.repository.MissionRepository;
import t.esprit.arctic.jobmatch.repository.UtilisateurRepository;
import t.esprit.arctic.jobmatch.service.NotificationService;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class freelanceCandidatureService {

    private final CandidatureMissionRepository candidatureRepo;
    private final MissionRepository missionRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final FreelanceWorkspaceService workspaceService;
    private final NotificationService notificationService;

    @Transactional
    public CandidatureResponseDTO postuler(Long missionId, String email, CandidatureRequestDTO request) {
        Utilisateur candidat = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new FreelanceNotFoundException("Utilisateur introuvable"));
        Mission mission = missionRepository.findById(missionId)
                .orElseThrow(() -> new FreelanceNotFoundException("Mission introuvable"));
        if (mission.getStatut() != MissionStatut.OUVERTE) {
            throw new FreelanceConflictException("Cette mission n'accepte plus de candidatures");
        }

        if (candidatureRepo.existsByMissionIdAndCandidatId(missionId, candidat.getId())) {
            throw new FreelanceConflictException("Vous avez déjà postulé à cette mission");
        }

        CandidatureMission c = new CandidatureMission();
        c.setMission(mission);
        c.setCandidat(candidat);
        if (request != null) {
            c.setCoverLetter(sanitizeCoverLetter(request.getCoverLetter()));
            c.setBidAmount(request.getBidAmount());
            c.setEstimatedDays(request.getEstimatedDays());
        }
        CandidatureMission saved = candidatureRepo.save(c);
        if (mission.getPubliePar() != null) {
            notificationService.createNotification(
                    mission.getPubliePar().getId(),
                    candidat.getId(),
                    "freelance_new_application",
                    candidat.getNom() + " a postulé à votre mission \"" + mission.getTitre() + "\""
            );
        }
        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<CandidatureResponseDTO> getCandidaturesDeMission(Long missionId) {
        return candidatureRepo.findByMissionId(missionId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CandidatureResponseDTO> mesCandidatures(String email) {
        Utilisateur candidat = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new FreelanceNotFoundException("Utilisateur introuvable"));
        return candidatureRepo.findByCandidatId(candidat.getId()).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<CandidatureResponseDTO> searchMesCandidatures(String email,
                                                              String statut,
                                                              String search,
                                                              int page,
                                                              int size,
                                                              String sortBy,
                                                              String sortDir) {
        Utilisateur candidat = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new FreelanceNotFoundException("Utilisateur introuvable"));
        Sort sort = Sort.by("desc".equalsIgnoreCase(sortDir) ? Sort.Direction.DESC : Sort.Direction.ASC,
                (sortBy == null || sortBy.isBlank()) ? "datePostulation" : sortBy);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), sort);

        Specification<CandidatureMission> spec = (root, query, cb) ->
                cb.equal(root.get("candidat").get("id"), candidat.getId());
        if (statut != null && !statut.isBlank()) {
            spec = spec.and((r, q, cb) -> cb.equal(r.get("statut"), CandidatureStatut.valueOf(statut)));
        }
        if (search != null && !search.isBlank()) {
            String normalized = "%" + search.toLowerCase() + "%";
            spec = spec.and((r, q, cb) -> cb.like(cb.lower(r.get("mission").get("titre")), normalized));
        }

        return candidatureRepo.findAll(spec, pageable).map(this::toDTO);
    }

    @Transactional
    public CandidatureResponseDTO shortlistCandidature(Long candidatureId, String email) {
        CandidatureMission c = candidatureRepo.findById(candidatureId)
                .orElseThrow(() -> new FreelanceNotFoundException("Candidature introuvable"));
        assertMissionOwner(c, email);
        c.setStatut(CandidatureStatut.SHORTLISTEE);
        return toDTO(candidatureRepo.save(c));
    }

    @Transactional
    public CandidatureResponseDTO accepterCandidature(Long candidatureId, String email) {
        CandidatureMission c = candidatureRepo.findById(candidatureId)
                .orElseThrow(() -> new FreelanceNotFoundException("Candidature introuvable"));
        assertMissionOwner(c, email);
        if (c.getMission().getStatut() != MissionStatut.OUVERTE) {
            throw new FreelanceConflictException("Impossible d'accepter: mission non ouverte");
        }
        c.setStatut(CandidatureStatut.ACCEPTEE);
        CandidatureMission saved = candidatureRepo.save(c);
        Mission mission = c.getMission();
        mission.setStatut(MissionStatut.EN_COURS);
        missionRepository.save(mission);

        candidatureRepo.findByMissionId(mission.getId()).forEach(other -> {
            if (!other.getId().equals(saved.getId())
                    && (other.getStatut() == CandidatureStatut.EN_ATTENTE || other.getStatut() == CandidatureStatut.SHORTLISTEE)) {
                other.setStatut(CandidatureStatut.REJETEE);
                candidatureRepo.save(other);
            }
        });
        notificationService.createNotification(
                c.getCandidat().getId(),
                mission.getPubliePar() != null ? mission.getPubliePar().getId() : null,
                "freelance_application_accepted",
                "Votre candidature pour \"" + mission.getTitre() + "\" a été acceptée"
        );

        return toDTO(saved);
    }

    @Transactional
    public CandidatureResponseDTO rejeterCandidature(Long candidatureId, String email) {
        CandidatureMission c = candidatureRepo.findById(candidatureId)
                .orElseThrow(() -> new FreelanceNotFoundException("Candidature introuvable"));
        assertMissionOwner(c, email);
        c.setStatut(CandidatureStatut.REJETEE);
        notificationService.createNotification(
                c.getCandidat().getId(),
                c.getMission().getPubliePar() != null ? c.getMission().getPubliePar().getId() : null,
                "freelance_application_rejected",
                "Votre candidature pour \"" + c.getMission().getTitre() + "\" a été rejetée"
        );
        return toDTO(candidatureRepo.save(c));
    }

    private CandidatureResponseDTO toDTO(CandidatureMission c) {
        return CandidatureResponseDTO.builder()
                .id(c.getId())
                .missionId(c.getMission().getId())
                .missionTitre(c.getMission().getTitre())
                .utilisateurId(c.getCandidat().getId())
                .utilisateurNom(c.getCandidat().getNom())
                .statut(c.getStatut().name())
                .datePostulation(c.getDatePostulation() != null ? c.getDatePostulation().toString() : null)
                .coverLetter(c.getCoverLetter())
                .bidAmount(c.getBidAmount())
                .estimatedDays(c.getEstimatedDays())
                .build();
    }

    private void assertMissionOwner(CandidatureMission candidature, String email) {
        Mission mission = candidature.getMission();
        if (mission.getPubliePar() == null || !email.equals(mission.getPubliePar().getEmail())) {
            throw new FreelanceAccessDeniedException("Seul le client propriétaire de la mission peut effectuer cette action");
        }
    }

    private String sanitizeCoverLetter(String value) {
        if (value == null) return null;
        String v = value.trim();
        if (v.isEmpty()) return null;
        return v.length() > 2000 ? v.substring(0, 2000) : v;
    }
}