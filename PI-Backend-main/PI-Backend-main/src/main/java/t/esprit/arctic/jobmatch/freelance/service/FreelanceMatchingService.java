package t.esprit.arctic.jobmatch.freelance.service;

import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.embedding.AllMiniLmL6V2EmbeddingModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import t.esprit.arctic.jobmatch.entity.Utilisateur;
import t.esprit.arctic.jobmatch.freelance.dto.MatchResultDTO;
import t.esprit.arctic.jobmatch.freelance.entity.CandidatureMission;
import t.esprit.arctic.jobmatch.freelance.entity.MissionStatut;
import t.esprit.arctic.jobmatch.freelance.entity.Mission;
import t.esprit.arctic.jobmatch.freelance.exception.FreelanceNotFoundException;
import t.esprit.arctic.jobmatch.freelance.repository.CandidatureMissionRepository;
import t.esprit.arctic.jobmatch.freelance.repository.MissionRepository;
import t.esprit.arctic.jobmatch.repository.UtilisateurRepository;

import java.util.*;
import java.util.stream.Collectors;

/**
 * AI-powered matching service using in-process sentence embeddings.
 * Uses the all-MiniLM-L6-v2 ONNX model (runs locally, no API calls).
 */
@Service
@RequiredArgsConstructor
public class FreelanceMatchingService {

    private final MissionRepository missionRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final CandidatureMissionRepository candidatureRepository;

    // In-process ONNX embedding model — loaded once, reused for every request
    private final EmbeddingModel embeddingModel = new AllMiniLmL6V2EmbeddingModel();

    // ────────────────────────────────────────────────────────────────────
    // Freelancer → "Smart Matching": find best missions for me
    // ────────────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<MatchResultDTO> matchMissionsForFreelancer(String email) {
        Utilisateur freelancer = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new FreelanceNotFoundException("Utilisateur introuvable : " + email));

        // Build a profile text from the freelancer's candidature history
        List<CandidatureMission> pastApplications = candidatureRepository.findByCandidatId(freelancer.getId());
        String profileText = buildFreelancerProfile(freelancer, pastApplications);
        Embedding profileEmbedding = embeddingModel.embed(profileText).content();

        // Get all open missions
        List<Mission> openMissions = missionRepository.findByStatut(MissionStatut.OUVERTE);

        // Already-applied mission IDs (exclude from results)
        Set<Long> alreadyApplied = pastApplications.stream()
                .map(c -> c.getMission().getId())
                .collect(Collectors.toSet());

        List<MatchResultDTO> results = new ArrayList<>();

        for (Mission mission : openMissions) {
            if (alreadyApplied.contains(mission.getId())) continue;

            String missionText = buildMissionText(mission);
            Embedding missionEmbedding = embeddingModel.embed(missionText).content();
            double score = cosineSimilarity(profileEmbedding.vector(), missionEmbedding.vector());

            // Also compute simple skill overlap for explainability
            List<String> matchingSkills = computeSkillOverlap(profileText, mission.getCompetences());

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

        // Sort by descending match score, return top 10
        results.sort(Comparator.comparingDouble(MatchResultDTO::getMatchScore).reversed());
        return results.stream().limit(10).collect(Collectors.toList());
    }

    // ────────────────────────────────────────────────────────────────────
    // Client → "Recommandations IA": find best freelancers for a mission
    // ────────────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<MatchResultDTO> matchTalentsForMission(Long missionId) {
        Mission mission = missionRepository.findById(missionId)
                .orElseThrow(() -> new FreelanceNotFoundException("Mission introuvable : " + missionId));

        String missionText = buildMissionText(mission);
        Embedding missionEmbedding = embeddingModel.embed(missionText).content();

        // Get all users who have ever applied to any mission (active freelancers)
        List<Long> allCandidateIds = candidatureRepository.findAll().stream()
                .map(c -> c.getCandidat().getId())
                .distinct()
                .collect(Collectors.toList());

        // Already applied to THIS mission
        Set<Long> alreadyApplied = candidatureRepository.findByMissionId(missionId).stream()
                .map(c -> c.getCandidat().getId())
                .collect(Collectors.toSet());

        List<MatchResultDTO> results = new ArrayList<>();

        for (Long candidateId : allCandidateIds) {
            if (alreadyApplied.contains(candidateId)) continue;

            Utilisateur candidate = utilisateurRepository.findById(candidateId).orElse(null);
            if (candidate == null) continue;

            List<CandidatureMission> history = candidatureRepository.findByCandidatId(candidateId);
            String profileText = buildFreelancerProfile(candidate, history);
            Embedding profileEmbedding = embeddingModel.embed(profileText).content();
            double score = cosineSimilarity(missionEmbedding.vector(), profileEmbedding.vector());

            List<String> matchingSkills = computeSkillOverlap(profileText, mission.getCompetences());

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

    // ────────────────────────────────────────────────────────────────────
    //  Helpers
    // ────────────────────────────────────────────────────────────────────

    private String buildFreelancerProfile(Utilisateur user, List<CandidatureMission> history) {
        StringBuilder sb = new StringBuilder();
        sb.append("Freelancer: ").append(user.getNom() != null ? user.getNom() : "").append(". ");

        // Collect all skills from missions they applied to
        Set<String> allSkills = new LinkedHashSet<>();
        Set<String> allDomains = new LinkedHashSet<>();
        for (CandidatureMission c : history) {
            Mission m = c.getMission();
            if (m.getCompetences() != null) allSkills.addAll(m.getCompetences());
            if (m.getTitre() != null) allDomains.add(m.getTitre());
            if (m.getDescription() != null) allDomains.add(m.getDescription());
        }

        if (!allSkills.isEmpty()) {
            sb.append("Skills: ").append(String.join(", ", allSkills)).append(". ");
        }
        if (!allDomains.isEmpty()) {
            sb.append("Experience in: ").append(String.join("; ", allDomains)).append(".");
        }

        // Fallback: if no history, use the user's name as minimal context
        if (history.isEmpty()) {
            sb.append("New freelancer looking for opportunities in technology and development.");
        }

        return sb.toString();
    }

    private String buildMissionText(Mission mission) {
        StringBuilder sb = new StringBuilder();
        sb.append("Mission: ").append(mission.getTitre()).append(". ");
        if (mission.getDescription() != null) {
            sb.append(mission.getDescription()).append(". ");
        }
        if (mission.getCompetences() != null && !mission.getCompetences().isEmpty()) {
            sb.append("Required skills: ").append(String.join(", ", mission.getCompetences())).append(".");
        }
        return sb.toString();
    }

    private List<String> computeSkillOverlap(String profileText, List<String> missionSkills) {
        if (missionSkills == null) return Collections.emptyList();
        String lower = profileText.toLowerCase();
        return missionSkills.stream()
                .filter(skill -> lower.contains(skill.toLowerCase()))
                .collect(Collectors.toList());
    }

    private double cosineSimilarity(float[] a, float[] b) {
        if (a.length != b.length) return 0.0;
        double dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        double denom = Math.sqrt(normA) * Math.sqrt(normB);
        return denom == 0 ? 0.0 : dot / denom;
    }
}
