package t.esprit.arctic.jobmatch.freelance.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import t.esprit.arctic.jobmatch.entity.Utilisateur;
import t.esprit.arctic.jobmatch.freelance.dto.MatchResultDTO;
import t.esprit.arctic.jobmatch.freelance.entity.CandidatureMission;
import t.esprit.arctic.jobmatch.freelance.entity.Mission;
import t.esprit.arctic.jobmatch.freelance.entity.MissionStatut;
import t.esprit.arctic.jobmatch.freelance.exception.FreelanceNotFoundException;
import t.esprit.arctic.jobmatch.freelance.repository.CandidatureMissionRepository;
import t.esprit.arctic.jobmatch.freelance.repository.MissionRepository;
import t.esprit.arctic.jobmatch.repository.UtilisateurRepository;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Freelance mission matching using lightweight heuristics (no external ML / ONNX).
 */
@Service
@RequiredArgsConstructor
public class FreelanceMatchingService {

    private final MissionRepository missionRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final CandidatureMissionRepository candidatureRepository;

    @Transactional(readOnly = true)
    public List<MatchResultDTO> matchMissionsForFreelancer(String email) {
        Utilisateur freelancer = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new FreelanceNotFoundException("Utilisateur introuvable : " + email));

        List<CandidatureMission> pastApplications = candidatureRepository.findByCandidatId(freelancer.getId());
        String profileText = buildFreelancerProfile(freelancer, pastApplications);

        List<Mission> openMissions = missionRepository.findByStatut(MissionStatut.OUVERTE);

        Set<Long> alreadyApplied = pastApplications.stream()
                .map(c -> c.getMission().getId())
                .collect(Collectors.toSet());

        List<MatchResultDTO> results = new ArrayList<>();

        for (Mission mission : openMissions) {
            if (alreadyApplied.contains(mission.getId())) {
                continue;
            }
            List<String> matchingSkills = computeSkillOverlap(profileText, mission.getCompetences());
            double score = heuristicScore(matchingSkills.size(), mission.getBudget());

            results.add(MatchResultDTO.builder()
                    .id(mission.getId())
                    .titre(mission.getTitre())
                    .description(mission.getDescription())
                    .budget(mission.getBudget())
                    .competences(mission.getCompetences())
                    .statut(mission.getStatut().name())
                    .matchScore(Math.round(score * 1000.0) / 1000.0)
                    .matchPercent((int) Math.round(score * 100))
                    .matchingSkills(matchingSkills)
                    .build());
        }

        results.sort(Comparator.comparingDouble(MatchResultDTO::getMatchScore).reversed());
        return results.stream().limit(10).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MatchResultDTO> matchTalentsForMission(Long missionId) {
        Mission mission = missionRepository.findById(missionId)
                .orElseThrow(() -> new FreelanceNotFoundException("Mission introuvable : " + missionId));

        List<Long> allCandidateIds = candidatureRepository.findAll().stream()
                .map(c -> c.getCandidat().getId())
                .distinct()
                .collect(Collectors.toList());

        Set<Long> alreadyApplied = candidatureRepository.findByMissionId(missionId).stream()
                .map(c -> c.getCandidat().getId())
                .collect(Collectors.toSet());

        List<MatchResultDTO> results = new ArrayList<>();

        for (Long candidateId : allCandidateIds) {
            if (alreadyApplied.contains(candidateId)) {
                continue;
            }

            Utilisateur candidate = utilisateurRepository.findById(candidateId).orElse(null);
            if (candidate == null) {
                continue;
            }

            List<CandidatureMission> history = candidatureRepository.findByCandidatId(candidateId);
            String profileText = buildFreelancerProfile(candidate, history);
            List<String> matchingSkills = computeSkillOverlap(profileText, mission.getCompetences());
            double score = heuristicScore(matchingSkills.size(), mission.getBudget());

            results.add(MatchResultDTO.builder()
                    .id(candidate.getId())
                    .nom(candidate.getNom())
                    .matchScore(Math.round(score * 1000.0) / 1000.0)
                    .matchPercent((int) Math.round(score * 100))
                    .matchingSkills(matchingSkills)
                    .build());
        }

        results.sort(Comparator.comparingDouble(MatchResultDTO::getMatchScore).reversed());
        return results.stream().limit(10).collect(Collectors.toList());
    }

    /** Score in [0,1] from overlap count and optional budget signal. */
    private static double heuristicScore(int overlapCount, Double budget) {
        double base = Math.min(1.0, 0.25 + overlapCount * 0.12);
        if (budget != null && budget > 0) {
            base = Math.min(1.0, base + 0.05);
        }
        return base;
    }

    private String buildFreelancerProfile(Utilisateur user, List<CandidatureMission> history) {
        StringBuilder sb = new StringBuilder();
        sb.append("Freelancer: ").append(user.getNom() != null ? user.getNom() : "").append(". ");

        Set<String> allSkills = new LinkedHashSet<>();
        Set<String> allDomains = new LinkedHashSet<>();
        for (CandidatureMission c : history) {
            Mission m = c.getMission();
            if (m.getCompetences() != null) {
                allSkills.addAll(m.getCompetences());
            }
            if (m.getTitre() != null) {
                allDomains.add(m.getTitre());
            }
            if (m.getDescription() != null) {
                allDomains.add(m.getDescription());
            }
        }

        if (!allSkills.isEmpty()) {
            sb.append("Skills: ").append(String.join(", ", allSkills)).append(". ");
        }
        if (!allDomains.isEmpty()) {
            sb.append("Experience in: ").append(String.join("; ", allDomains)).append(".");
        }

        if (history.isEmpty()) {
            sb.append("New freelancer looking for opportunities in technology and development.");
        }

        return sb.toString();
    }

    private List<String> computeSkillOverlap(String profileText, List<String> missionSkills) {
        if (missionSkills == null) {
            return Collections.emptyList();
        }
        String lower = profileText.toLowerCase();
        return missionSkills.stream()
                .filter(skill -> lower.contains(skill.toLowerCase()))
                .collect(Collectors.toList());
    }
}
