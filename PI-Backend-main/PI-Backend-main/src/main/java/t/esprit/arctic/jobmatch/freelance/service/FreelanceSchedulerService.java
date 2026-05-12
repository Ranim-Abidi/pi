package t.esprit.arctic.jobmatch.freelance.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import t.esprit.arctic.jobmatch.entity.Role;
import t.esprit.arctic.jobmatch.entity.Utilisateur;
import t.esprit.arctic.jobmatch.freelance.dto.AutoBookRequest;
import t.esprit.arctic.jobmatch.freelance.dto.AvailabilitySlotDTO;
import t.esprit.arctic.jobmatch.freelance.dto.CreateEventRequest;
import t.esprit.arctic.jobmatch.freelance.dto.CreateAvailabilitySlotRequest;
import t.esprit.arctic.jobmatch.freelance.dto.DeadlineItemDTO;
import t.esprit.arctic.jobmatch.freelance.dto.FreelanceEventDTO;
import t.esprit.arctic.jobmatch.freelance.dto.SchedulerUserOptionDTO;
import t.esprit.arctic.jobmatch.freelance.entity.*;
import t.esprit.arctic.jobmatch.freelance.exception.FreelanceBadRequestException;
import t.esprit.arctic.jobmatch.freelance.exception.FreelanceAccessDeniedException;
import t.esprit.arctic.jobmatch.freelance.exception.FreelanceConflictException;
import t.esprit.arctic.jobmatch.freelance.exception.FreelanceNotFoundException;
import t.esprit.arctic.jobmatch.freelance.repository.CandidatureMissionRepository;
import t.esprit.arctic.jobmatch.freelance.repository.FreelanceAvailabilitySlotRepository;
import t.esprit.arctic.jobmatch.freelance.repository.FreelanceContractRepository;
import t.esprit.arctic.jobmatch.freelance.repository.FreelanceEventRepository;
import t.esprit.arctic.jobmatch.freelance.repository.FreelanceMilestoneRepository;
import t.esprit.arctic.jobmatch.freelance.repository.MissionRepository;
import t.esprit.arctic.jobmatch.repository.UtilisateurRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FreelanceSchedulerService {

    private final FreelanceEventRepository eventRepository;
    private final FreelanceAvailabilitySlotRepository availabilitySlotRepository;
    private final FreelanceContractRepository contractRepository;
    private final FreelanceMilestoneRepository milestoneRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final MissionRepository missionRepository;
    private final CandidatureMissionRepository candidatureMissionRepository;

    // ── Fetch events ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<FreelanceEventDTO> getMyEvents(String email) {
        Utilisateur user = findUser(email);
        return eventRepository.findAllByUserId(user.getId()).stream()
                .map(FreelanceEventDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FreelanceEventDTO> getMyEventsByRange(String email, LocalDateTime start, LocalDateTime end) {
        Utilisateur user = findUser(email);
        return eventRepository.findByUserIdAndDateRange(user.getId(), start, end).stream()
                .map(FreelanceEventDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SchedulerUserOptionDTO> getCalendarCounterparties(String email, String viewMode) {
        Utilisateur me = findUser(email);
        boolean asClient = me.getRole() == Role.CLIENT_FREELANCE;
        if (viewMode != null && !viewMode.isBlank()) {
            String v = viewMode.trim().toUpperCase().replace("ROLE_", "");
            if ("CLIENT_FREELANCE".equals(v) || "CLIENT".equals(v)) {
                asClient = true;
            } else if ("FREELANCER".equals(v) || "CANDIDAT".equals(v)) {
                asClient = false;
            }
        }

        List<Utilisateur> users;
        if (asClient) {
            users = new ArrayList<>(candidatureMissionRepository.findDistinctFreelancersForClient(
                    me.getId(),
                    List.of(CandidatureStatut.ACCEPTEE, CandidatureStatut.SHORTLISTEE, CandidatureStatut.EN_ATTENTE)
            ));
            for (FreelanceContract c : contractRepository.findByClientId(me.getId())) {
                users.add(c.getFreelancer());
            }
        } else {
            users = new ArrayList<>(candidatureMissionRepository.findDistinctClientsForFreelancer(
                    me.getId(),
                    List.of(CandidatureStatut.ACCEPTEE, CandidatureStatut.SHORTLISTEE, CandidatureStatut.EN_ATTENTE)
            ));
            for (FreelanceContract c : contractRepository.findByFreelancerId(me.getId())) {
                users.add(c.getClient());
            }
        }

        Map<Long, Utilisateur> dedup = new LinkedHashMap<>();
        for (Utilisateur u : users) {
            if (u != null && !u.getId().equals(me.getId())) {
                dedup.putIfAbsent(u.getId(), u);
            }
        }
        return dedup.values().stream()
                .map(u -> SchedulerUserOptionDTO.builder()
                        .id(u.getId())
                        .nom(u.getNom())
                        .email(u.getEmail())
                        .role(u.getRole() != null ? u.getRole().name() : null)
                        .build())
                .collect(Collectors.toList());
    }

    // ── Create event ─────────────────────────────────────────────────

    @Transactional
    public FreelanceEventDTO createEvent(String email, CreateEventRequest req) {
        Utilisateur organizer = findUser(email);
        LocalDateTime start = LocalDateTime.parse(req.getStartDate());
        LocalDateTime end = LocalDateTime.parse(req.getEndDate());
        validateDateRange(start, end);
        ensureNoConflict(organizer.getId(), start, end, null, "organisateur");

        Mission mission = null;
        if (req.getMissionId() != null) {
            mission = missionRepository.findById(req.getMissionId())
                    .orElseThrow(() -> new FreelanceNotFoundException("Mission introuvable"));
        }

        Utilisateur participant = resolveAndValidateParticipant(organizer, mission, req);
        // Do not block creation on participant overlaps:
        // client and freelancer calendars can intentionally contain overlaps.

        FreelanceEvent event = new FreelanceEvent();
        event.setTitle(req.getTitle());
        event.setDescription(req.getDescription());
        event.setType(EventType.valueOf(req.getType()));
        event.setStartDate(start);
        event.setEndDate(end);
        event.setStatus(EventStatus.SCHEDULED);
        event.setOrganizer(organizer);
        event.setParticipant(participant);
        event.setMission(mission);

        return FreelanceEventDTO.fromEntity(eventRepository.save(event));
    }

    // ── Update event ─────────────────────────────────────────────────

    @Transactional
    public FreelanceEventDTO updateEvent(Long eventId, String email, CreateEventRequest req) {
        FreelanceEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new FreelanceNotFoundException("Événement introuvable"));

        Utilisateur user = findUser(email);
        if (!event.getOrganizer().getId().equals(user.getId())) {
            throw new FreelanceAccessDeniedException("Seul l'organisateur peut modifier cet événement");
        }

        LocalDateTime start = LocalDateTime.parse(req.getStartDate());
        LocalDateTime end = LocalDateTime.parse(req.getEndDate());
        validateDateRange(start, end);
        ensureNoConflict(user.getId(), start, end, event.getId(), "organisateur");

        Mission mission = null;
        if (req.getMissionId() != null) {
            mission = missionRepository.findById(req.getMissionId())
                    .orElseThrow(() -> new FreelanceNotFoundException("Mission introuvable"));
        } else {
            event.setMission(null);
        }

        Utilisateur participant = resolveAndValidateParticipant(user, mission, req);
        // Keep organizer conflict checks only; participant overlap is informational, not blocking.

        event.setTitle(req.getTitle());
        event.setDescription(req.getDescription());
        event.setType(EventType.valueOf(req.getType()));
        event.setStartDate(start);
        event.setEndDate(end);
        event.setParticipant(participant);
        event.setMission(mission);

        return FreelanceEventDTO.fromEntity(eventRepository.save(event));
    }

    // ── Change status ────────────────────────────────────────────────

    @Transactional
    public FreelanceEventDTO updateStatus(Long eventId, String email, String newStatus) {
        FreelanceEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new FreelanceNotFoundException("Événement introuvable"));

        Utilisateur user = findUser(email);
        boolean isOrganizer = event.getOrganizer().getId().equals(user.getId());
        boolean isParticipant = event.getParticipant() != null && event.getParticipant().getId().equals(user.getId());

        if (!isOrganizer && !isParticipant) {
            throw new FreelanceAccessDeniedException("Vous n'êtes pas autorisé à modifier cet événement");
        }

        event.setStatus(EventStatus.valueOf(newStatus));
        return FreelanceEventDTO.fromEntity(eventRepository.save(event));
    }

    // ── Delete event ─────────────────────────────────────────────────

    @Transactional
    public void deleteEvent(Long eventId, String email) {
        FreelanceEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new FreelanceNotFoundException("Événement introuvable"));

        Utilisateur user = findUser(email);
        if (!event.getOrganizer().getId().equals(user.getId())) {
            throw new FreelanceAccessDeniedException("Seul l'organisateur peut supprimer cet événement");
        }

        eventRepository.delete(event);
    }

    // ── Availability slots ────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<AvailabilitySlotDTO> getMyAvailability(String email) {
        Utilisateur freelancer = findUser(email);
        return availabilitySlotRepository.findByFreelancerIdOrderByStartDateAsc(freelancer.getId())
                .stream()
                .map(AvailabilitySlotDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public AvailabilitySlotDTO createAvailabilitySlot(String email, CreateAvailabilitySlotRequest req) {
        Utilisateur freelancer = findUser(email);
        LocalDateTime start = LocalDateTime.parse(req.getStartDate());
        LocalDateTime end = LocalDateTime.parse(req.getEndDate());
        validateDateRange(start, end);
        ensureNoAvailabilityOverlap(freelancer.getId(), start, end, null);

        FreelanceAvailabilitySlot slot = FreelanceAvailabilitySlot.builder()
                .freelancer(freelancer)
                .startDate(start)
                .endDate(end)
                .booked(false)
                .build();
        return AvailabilitySlotDTO.fromEntity(availabilitySlotRepository.save(slot));
    }

    @Transactional
    public void deleteAvailabilitySlot(Long slotId, String email) {
        Utilisateur freelancer = findUser(email);
        FreelanceAvailabilitySlot slot = availabilitySlotRepository.findById(slotId)
                .orElseThrow(() -> new FreelanceNotFoundException("Créneau introuvable"));
        if (!slot.getFreelancer().getId().equals(freelancer.getId())) {
            throw new FreelanceAccessDeniedException("Vous ne pouvez supprimer que vos créneaux");
        }
        availabilitySlotRepository.delete(slot);
    }

    @Transactional
    public FreelanceEventDTO autoBook(String email, AutoBookRequest req) {
        Utilisateur organizer = findUser(email);
        if (req.getFreelancerId() == null) {
            throw new FreelanceBadRequestException("freelancerId requis");
        }
        LocalDateTime start = LocalDateTime.parse(req.getStartDate());
        LocalDateTime end = LocalDateTime.parse(req.getEndDate());
        validateDateRange(start, end);
        ensureNoConflict(organizer.getId(), start, end, null, "organisateur");

        Utilisateur freelancer = utilisateurRepository.findById(req.getFreelancerId())
                .orElseThrow(() -> new FreelanceNotFoundException("Freelancer introuvable"));
        ensureNoConflict(freelancer.getId(), start, end, null, "participant");

        FreelanceAvailabilitySlot slot = availabilitySlotRepository
                .findBookableSlots(freelancer.getId(), start, end)
                .stream()
                .findFirst()
                .orElseThrow(() -> new FreelanceConflictException("Aucun créneau disponible dans cet intervalle"));

        FreelanceEvent event = new FreelanceEvent();
        event.setTitle(req.getTitle() != null ? req.getTitle() : "Booking");
        event.setDescription(req.getDescription());
        event.setType(req.getType() != null ? EventType.valueOf(req.getType()) : EventType.MEETING);
        event.setStartDate(start);
        event.setEndDate(end);
        event.setStatus(EventStatus.CONFIRMED);
        event.setOrganizer(organizer);
        event.setParticipant(freelancer);
        if (req.getMissionId() != null) {
            Mission mission = missionRepository.findById(req.getMissionId())
                    .orElseThrow(() -> new FreelanceNotFoundException("Mission introuvable"));
            event.setMission(mission);
        }
        FreelanceEvent saved = eventRepository.save(event);
        slot.setBooked(true);
        slot.setBookedByUserId(organizer.getId());
        availabilitySlotRepository.save(slot);
        return FreelanceEventDTO.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<DeadlineItemDTO> getUpcomingDeadlines(String email, int days) {
        Utilisateur user = findUser(email);
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime until = now.plusDays(Math.max(days, 1));

        List<DeadlineItemDTO> items = new ArrayList<>();
        eventRepository.findByUserIdAndDateRange(user.getId(), now, until)
                .stream()
                .filter(e -> e.getType() == EventType.DEADLINE || e.getType() == EventType.MILESTONE)
                .forEach(e -> items.add(DeadlineItemDTO.builder()
                        .kind("EVENT")
                        .sourceId(e.getId())
                        .title(e.getTitle())
                        .dueDate(e.getEndDate() != null ? e.getEndDate().toString() : e.getStartDate().toString())
                        .status(e.getStatus() != null ? e.getStatus().name() : "SCHEDULED")
                        .missionId(e.getMission() != null ? e.getMission().getId() : null)
                        .missionTitre(e.getMission() != null ? e.getMission().getTitre() : null)
                        .build()));

        List<Long> contractIds = contractRepository.findByFreelancerId(user.getId()).stream().map(FreelanceContract::getId).toList();
        contractIds.addAll(contractRepository.findByClientId(user.getId()).stream().map(FreelanceContract::getId).toList());
        contractIds.stream().distinct().forEach(contractId -> milestoneRepository.findByContractId(contractId)
                .stream()
                .filter(m -> m.getDueDate() != null && !m.getDueDate().isBefore(now) && !m.getDueDate().isAfter(until))
                .forEach(m -> items.add(DeadlineItemDTO.builder()
                        .kind("MILESTONE")
                        .sourceId(m.getId())
                        .title(m.getTitle())
                        .dueDate(m.getDueDate().toString())
                        .status(m.getStatus() != null ? m.getStatus().name() : "PENDING")
                        .missionId(m.getContract() != null && m.getContract().getMission() != null ? m.getContract().getMission().getId() : null)
                        .missionTitre(m.getContract() != null && m.getContract().getMission() != null ? m.getContract().getMission().getTitre() : null)
                        .build())));

        return items.stream()
                .sorted(Comparator.comparing(DeadlineItemDTO::getDueDate, Comparator.nullsLast(String::compareTo)))
                .collect(Collectors.toList());
    }

    // ── Helper ───────────────────────────────────────────────────────

    private Utilisateur findUser(String email) {
        return utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new FreelanceNotFoundException("Utilisateur introuvable : " + email));
    }

    private void validateDateRange(LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null || !end.isAfter(start)) {
            throw new FreelanceBadRequestException("Intervalle de date invalide");
        }
    }

    private void ensureNoConflict(
            Long userId,
            LocalDateTime start,
            LocalDateTime end,
            Long excludeId,
            String who
    ) {
        var conflicts = eventRepository.findConflicts(userId, start, end, excludeId);
        if (!conflicts.isEmpty()) {
            var c = conflicts.get(0);
            String conflictTitle = c.getTitle() != null ? c.getTitle() : "événement";
            String conflictRange = c.getStartDate() + " → " + c.getEndDate();
            throw new FreelanceConflictException(
                    "Ce créneau chevauche un événement existant (" + who + "): " +
                            conflictTitle + " (" + conflictRange + ")"
            );
        }
    }

    private void ensureNoAvailabilityOverlap(Long userId, LocalDateTime start, LocalDateTime end, Long excludeId) {
        var overlaps = availabilitySlotRepository.findOverlaps(userId, start, end, excludeId);
        if (!overlaps.isEmpty()) {
            var s = overlaps.get(0);
            throw new FreelanceConflictException(
                    "Ce créneau de disponibilité chevauche un autre créneau: " +
                            s.getStartDate() + " → " + s.getEndDate()
            );
        }
    }

    private Utilisateur resolveAndValidateParticipant(Utilisateur organizer, Mission mission, CreateEventRequest req) {
        Long explicit = firstNonNull(req.getParticipantId(), req.getClientId(), req.getFreelancerId());
        Utilisateur counterparty = null;
        if (explicit != null) {
            counterparty = utilisateurRepository.findById(explicit)
                    .orElseThrow(() -> new FreelanceNotFoundException("Contrepartie introuvable"));
        }

        if (counterparty == null && mission != null) {
            counterparty = inferCounterpartyFromMission(organizer, mission);
        }

        if (counterparty != null) {
            assertLinkedForEvent(organizer, counterparty, mission);
        }

        return counterparty;
    }

    private Utilisateur inferCounterpartyFromMission(Utilisateur organizer, Mission mission) {
        if (mission.getPubliePar() == null) {
            return null;
        }
        Long publisherId = mission.getPubliePar().getId();
        if (publisherId.equals(organizer.getId())) {
            List<CandidatureMission> apps = candidatureMissionRepository.findByMissionId(mission.getId());
            List<CandidatureMission> accepted = apps.stream()
                    .filter(c -> c.getStatut() == CandidatureStatut.ACCEPTEE)
                    .toList();
            if (accepted.size() == 1) {
                return accepted.get(0).getCandidat();
            }
            return null;
        }
        return mission.getPubliePar();
    }

    private void assertLinkedForEvent(Utilisateur organizer, Utilisateur counterparty, Mission mission) {
        if (counterparty.getId().equals(organizer.getId())) {
            throw new FreelanceBadRequestException("La contrepartie ne peut pas être vous-même");
        }

        if (mission != null) {
            boolean missionOk =
                    (mission.getPubliePar() != null && mission.getPubliePar().getId().equals(organizer.getId()))
                            || candidatureMissionRepository.existsByMissionIdAndCandidatId(mission.getId(), organizer.getId());
            if (!missionOk) {
                throw new FreelanceAccessDeniedException("Vous ne pouvez pas lier cet événement à cette mission");
            }

            if (mission.getPubliePar() != null) {
                Long pubId = mission.getPubliePar().getId();
                boolean counterpartyOk = counterparty.getId().equals(pubId)
                        || candidatureMissionRepository.existsByMissionIdAndCandidatId(mission.getId(), counterparty.getId());
                if (!counterpartyOk) {
                    throw new FreelanceBadRequestException("La contrepartie ne correspond pas à cette mission");
                }
            }
            return;
        }

        boolean contractLink =
                contractRepository.existsByClientIdAndFreelancerId(organizer.getId(), counterparty.getId())
                        || contractRepository.existsByClientIdAndFreelancerId(counterparty.getId(), organizer.getId());
        if (contractLink) {
            return;
        }

        if (organizer.getRole() == Role.CLIENT_FREELANCE) {
            boolean ok = candidatureMissionRepository.findDistinctFreelancersForClient(
                    organizer.getId(),
                    List.of(CandidatureStatut.ACCEPTEE, CandidatureStatut.SHORTLISTEE, CandidatureStatut.EN_ATTENTE)
            ).stream().anyMatch(u -> u.getId().equals(counterparty.getId()));
            if (!ok) {
                throw new FreelanceBadRequestException("Sélectionnez un freelancer lié à vos missions");
            }
            return;
        }

        boolean ok = candidatureMissionRepository.findDistinctClientsForFreelancer(
                organizer.getId(),
                List.of(CandidatureStatut.ACCEPTEE, CandidatureStatut.SHORTLISTEE, CandidatureStatut.EN_ATTENTE)
        ).stream().anyMatch(u -> u.getId().equals(counterparty.getId()));
        if (!ok) {
            throw new FreelanceBadRequestException("Sélectionnez un client lié à vos missions");
        }
    }

    private Long firstNonNull(Long... ids) {
        if (ids == null) return null;
        for (Long id : ids) {
            if (id != null) return id;
        }
        return null;
    }
}
