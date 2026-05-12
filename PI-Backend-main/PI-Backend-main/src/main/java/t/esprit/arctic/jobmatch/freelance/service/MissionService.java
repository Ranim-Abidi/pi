package t.esprit.arctic.jobmatch.freelance.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import t.esprit.arctic.jobmatch.entity.Utilisateur;
import t.esprit.arctic.jobmatch.freelance.dto.MissionDTO;
import t.esprit.arctic.jobmatch.freelance.dto.MissionResponseDTO;
import t.esprit.arctic.jobmatch.freelance.entity.Mission;
import t.esprit.arctic.jobmatch.freelance.entity.MissionStatut;
import t.esprit.arctic.jobmatch.freelance.exception.FreelanceAccessDeniedException;
import t.esprit.arctic.jobmatch.freelance.exception.FreelanceNotFoundException;
import t.esprit.arctic.jobmatch.freelance.repository.MissionRepository;
import t.esprit.arctic.jobmatch.repository.UtilisateurRepository;
import t.esprit.arctic.jobmatch.service.NotificationService;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MissionService {

    private final MissionRepository missionRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final t.esprit.arctic.jobmatch.freelance.repository.CandidatureMissionRepository candidatureRepository;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<MissionResponseDTO> getMissionsOuvertes() {
        return missionRepository.findByStatut(MissionStatut.OUVERTE)
                .stream()
                .map(MissionResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MissionResponseDTO getMissionById(Long id) {
        Mission mission = missionRepository.findById(id)
                .orElseThrow(() -> new FreelanceNotFoundException("Mission introuvable : " + id));
        return MissionResponseDTO.fromEntity(mission);
    }

    @Transactional
    public MissionResponseDTO creerMission(MissionDTO dto, String email) {
        Utilisateur publisher = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new FreelanceNotFoundException("Utilisateur introuvable : " + email));
        Mission mission = new Mission();
        mission.setTitre(dto.getTitre());
        mission.setDescription(dto.getDescription());
        mission.setBudget(dto.getBudget());
        mission.setCompetences(dto.getCompetences());
        mission.setExperienceLevel(dto.getExperienceLevel());
        mission.setLocation(dto.getLocation());
        mission.setRemoteAvailable(dto.getRemoteAvailable());
        mission.setAvailability(dto.getAvailability());
        mission.setPubliePar(publisher);
        Mission saved = missionRepository.save(mission);
        notificationService.createNotification(
                publisher.getId(),
                publisher.getId(),
                "freelance_new_mission",
                "Nouvelle mission publiée: \"" + saved.getTitre() + "\""
        );
        return MissionResponseDTO.fromEntity(saved);
    }

    @Transactional
    public MissionResponseDTO updateMission(Long id, MissionDTO dto, String email) {
        Mission mission = missionRepository.findById(id)
                .orElseThrow(() -> new FreelanceNotFoundException("Mission introuvable : " + id));

        // Verify ownership
        if (!mission.getPubliePar().getEmail().equals(email)) {
            throw new FreelanceAccessDeniedException("Vous n'êtes pas le propriétaire de cette mission");
        }

        mission.setTitre(dto.getTitre());
        mission.setDescription(dto.getDescription());
        mission.setBudget(dto.getBudget());
        mission.setCompetences(dto.getCompetences());
        mission.setExperienceLevel(dto.getExperienceLevel());
        mission.setLocation(dto.getLocation());
        mission.setRemoteAvailable(dto.getRemoteAvailable());
        mission.setAvailability(dto.getAvailability());
        Mission saved = missionRepository.save(mission);
        return MissionResponseDTO.fromEntity(saved);
    }

    @Transactional
    public void deleteMission(Long id, String email) {
        Mission mission = missionRepository.findById(id)
                .orElseThrow(() -> new FreelanceNotFoundException("Mission introuvable : " + id));

        // Verify ownership
        if (!mission.getPubliePar().getEmail().equals(email)) {
            throw new FreelanceAccessDeniedException("Vous n'êtes pas le propriétaire de cette mission");
        }

        // Delete candidatures first to prevent foreign key errors
        candidatureRepository.deleteAllByMissionId(mission.getId());
        
        missionRepository.delete(mission);
    }

    @Transactional(readOnly = true)
    public List<MissionResponseDTO> getMissionsParPublisher(String email) {
        Utilisateur publisher = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new FreelanceNotFoundException("Utilisateur introuvable : " + email));
        return missionRepository.findByPublieParId(publisher.getId())
                .stream()
                .map(MissionResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<MissionResponseDTO> searchMissions(String email,
                                                   Double minPrice,
                                                   Double maxPrice,
                                                   String skill,
                                                   String experienceLevel,
                                                   String location,
                                                   String availability,
                                                   MissionStatut status,
                                                   int page,
                                                   int size,
                                                   String sortBy,
                                                   String sortDir,
                                                   boolean onlyMine) {
        Utilisateur currentUser = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new FreelanceNotFoundException("Utilisateur introuvable : " + email));
        Sort sort = Sort.by("desc".equalsIgnoreCase(sortDir) ? Sort.Direction.DESC : Sort.Direction.ASC,
                (sortBy == null || sortBy.isBlank()) ? "dateCreation" : sortBy);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), sort);

        Specification<Mission> spec = (root, query, cb) -> cb.conjunction();
        if (minPrice != null) spec = spec.and((r, q, cb) -> cb.greaterThanOrEqualTo(r.get("budget"), minPrice));
        if (maxPrice != null) spec = spec.and((r, q, cb) -> cb.lessThanOrEqualTo(r.get("budget"), maxPrice));
        if (skill != null && !skill.isBlank()) {
            spec = spec.and((r, q, cb) -> cb.like(cb.lower(r.join("competences")), "%" + skill.toLowerCase() + "%"));
        }
        if (experienceLevel != null && !experienceLevel.isBlank()) {
            spec = spec.and((r, q, cb) -> cb.equal(cb.lower(r.get("experienceLevel")), experienceLevel.toLowerCase()));
        }
        if (location != null && !location.isBlank()) {
            spec = spec.and((r, q, cb) -> cb.like(cb.lower(r.get("location")), "%" + location.toLowerCase() + "%"));
        }
        if (availability != null && !availability.isBlank()) {
            spec = spec.and((r, q, cb) -> cb.equal(cb.lower(r.get("availability")), availability.toLowerCase()));
        }
        if (status != null) {
            spec = spec.and((r, q, cb) -> cb.equal(r.get("statut"), status));
        }
        if (onlyMine) {
            spec = spec.and((r, q, cb) -> cb.equal(r.get("publiePar").get("id"), currentUser.getId()));
        }
        return missionRepository.findAll(spec, pageable).map(MissionResponseDTO::fromEntity);
    }
}