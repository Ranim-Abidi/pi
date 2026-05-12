package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import t.esprit.arctic.jobmatch.dto.CandidateStatsDTO;
import t.esprit.arctic.jobmatch.entity.*;
import t.esprit.arctic.jobmatch.exception.ResourceNotFoundException;
import t.esprit.arctic.jobmatch.repository.*;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CandidateStatsService {

    private final CandidatRepository candidatRepository;
    private final CandidatureRepository candidatureRepository;
    private final InscriptionFormationRepository inscriptionFormationRepository;
    private final MessageRepository messageRepository;

    /**
     * Récupère les statistiques d'un candidat spécifique
     * @param candidatId ID du candidat
     * @return Statistiques du candidat
     */
    public CandidateStatsDTO getCandidateStats(Long candidatId) {
        log.info("📊 Fetching stats for candidate ID: {}", candidatId);
        try {
            Optional<Candidat> candidatOpt = candidatRepository.findById(candidatId);
            if (candidatOpt.isEmpty()) {
                log.error("❌ Candidate not found with ID: {}", candidatId);
                throw new ResourceNotFoundException("Candidate with ID " + candidatId + " not found. The account may have been deleted.");
            }

            Candidat candidat = candidatOpt.get();
            CandidateStatsDTO stats = new CandidateStatsDTO();
            stats.setCandidatId(candidat.getId());
            stats.setCandidatName(candidat.getNom() + " " + candidat.getPrenom());
            stats.setEmail(candidat.getEmail());

            // Application stats
            List<Candidature> candidatures = candidatureRepository.findByCandidatId(candidatId);
            stats.setTotalApplications((long) candidatures.size());
            stats.setAcceptedApplications(candidatures.stream()
                    .filter(c -> "ACCEPTED".equals(c.getStatut())).count());
            stats.setRejectedApplications(candidatures.stream()
                    .filter(c -> "REJECTED".equals(c.getStatut())).count());
            stats.setPendingApplications(candidatures.stream()
                    .filter(c -> "PENDING".equals(c.getStatut())).count());

            // Formation stats
            List<InscriptionFormation> inscriptions = inscriptionFormationRepository.findByCandidatId(candidatId);
            stats.setTotalFormations((long) inscriptions.size());
            stats.setCompletedFormations(inscriptions.stream()
                    .filter(i -> "Terminé".equals(i.getStatut())).count());
            stats.setInProgressFormations(inscriptions.stream()
                    .filter(i -> "En cours".equals(i.getStatut())).count());

            // Profile stats
            stats.setCompetencesCount(candidat.getCompetences() != null ? candidat.getCompetences().size() : 0);
            stats.setCvUploaded(candidat.getCvUrl() != null && !candidat.getCvUrl().isEmpty());
            stats.setProfilePictureUploaded(candidat.getProfilePictureUrl() != null && !candidat.getProfilePictureUrl().isEmpty());
            stats.setProfileCompleteness(calculateProfileCompleteness(candidat));

            List<Message> messages = messageRepository.findByCandidatIdOrderByDateEnvoiDesc(candidat.getId());
            stats.setMessagesCount(messages.size());
            stats.setSavedJobsCount(0);
            stats.setViewsCount(0);

            if (stats.getTotalApplications() > 0) {
                double successRate = (stats.getAcceptedApplications() / (double) stats.getTotalApplications()) * 100;
                stats.setApplicationSuccessRate(Math.round(successRate * 100.0) / 100.0);
            } else {
                stats.setApplicationSuccessRate(0.0);
            }

            if (stats.getTotalFormations() > 0) {
                double completionRate = (stats.getCompletedFormations() / (double) stats.getTotalFormations()) * 100;
                stats.setFormationCompletionRate(Math.round(completionRate * 100.0) / 100.0);
            } else {
                stats.setFormationCompletionRate(0.0);
            }

            log.info("✅ Stats retrieved for candidate: {}", candidat.getEmail());
            return stats;
        } catch (ResourceNotFoundException e) {
            throw e;
        } catch (Exception e) {
            log.error("❌ Error fetching candidate stats: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch candidate stats", e);
        }
    }

    /**
     * Calcule le pourcentage de complétude du profil
     */
    private Integer calculateProfileCompleteness(Candidat candidat) {
        int completeness = 0;
        int totalFields = 8;

        if (candidat.getNom() != null && !candidat.getNom().isEmpty()) completeness++;
        if (candidat.getPrenom() != null && !candidat.getPrenom().isEmpty()) completeness++;
        if (candidat.getTelephone() != null && !candidat.getTelephone().isEmpty()) completeness++;
        if (candidat.getDescription() != null && !candidat.getDescription().isEmpty()) completeness++;
        if (candidat.getCvUrl() != null && !candidat.getCvUrl().isEmpty()) completeness++;
        if (candidat.getProfilePictureUrl() != null && !candidat.getProfilePictureUrl().isEmpty()) completeness++;
        if (candidat.getCompetences() != null && !candidat.getCompetences().isEmpty()) completeness++;
        if (candidat.getLocalisation() != null) completeness++;

        return (completeness * 100) / totalFields;
    }

    /**
     * Récupère les statistiques pour tous les candidats (admin)
     * @return Liste de statistiques pour tous les candidats
     */
    public List<CandidateStatsDTO> getAllCandidatesStats() {
        log.info("📊 Fetching stats for all candidates");
        try {
            List<Candidat> allCandidates = candidatRepository.findAll();
            return allCandidates.stream()
                    .map(candidat -> getCandidateStats(candidat.getId()))
                    .toList();
        } catch (Exception e) {
            log.error("❌ Error fetching all candidates stats: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch candidates stats", e);
        }
    }
}
