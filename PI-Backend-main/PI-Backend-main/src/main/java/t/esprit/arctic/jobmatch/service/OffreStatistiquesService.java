package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import t.esprit.arctic.jobmatch.dto.OffreStatistiquesDTO;
import t.esprit.arctic.jobmatch.repository.OffreEmploiRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class OffreStatistiquesService {

    private final OffreEmploiRepository offreEmploiRepository;

    /**
     * Récupère toutes les offres actives avec leurs statistiques de candidatures
     * @return Liste d'offres avec stats
     */
    public List<OffreStatistiquesDTO> getOffresAvecStatistiques() {
        log.info("📊 Fetching offers with candidature statistics...");
        try {
            List<OffreStatistiquesDTO> offres = offreEmploiRepository.findOffresAvecStatistiques();
            log.info("✅ Found {} offers with statistics", offres.size());
            return offres;
        } catch (Exception e) {
            log.error("❌ Error fetching offers with statistics: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch offers with statistics", e);
        }
    }

    /**
     * Récupère les offres d'un recruteur avec stats
     * @param recruteurId ID du recruteur
     * @return Liste d'offres du recruteur avec stats
     */
    public List<OffreStatistiquesDTO> getOffresRecruteurAvecStats(Long recruteurId) {
        log.info("📊 Fetching offers for recruiter ID: {}", recruteurId);
        try {
            List<OffreStatistiquesDTO> offres = offreEmploiRepository.findOffresParRecruteurAvecStats(recruteurId);
            log.info("✅ Found {} offers for recruiter", offres.size());
            return offres;
        } catch (Exception e) {
            log.error("❌ Error fetching recruiter offers: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch recruiter offers", e);
        }
    }

    /**
     * Récupère les offres dans une plage de salaire avec un minimum de candidatures
     * @param salaryMin Salaire minimum (en milliers)
     * @param salaryMax Salaire maximum (en milliers)
     * @param minCandidatures Nombre minimum de candidatures requises
     * @return Liste d'offres filtrées
     */
    public List<OffreStatistiquesDTO> getOffresBySalaryRange(int salaryMin, int salaryMax, long minCandidatures) {
        log.info("📊 Fetching offers with salary range: {} - {} and min {} candidatures", 
                 salaryMin, salaryMax, minCandidatures);
        try {
            List<OffreStatistiquesDTO> offres = offreEmploiRepository
                    .findOffresBySalaryRangeWithCandidatures(salaryMin, salaryMax, minCandidatures);
            log.info("✅ Found {} offers in salary range", offres.size());
            return offres;
        } catch (Exception e) {
            log.error("❌ Error fetching offers by salary range: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch offers by salary range", e);
        }
    }

    /**
     * Récupère le top des offres par nombre de candidatures
     * @param limit Nombre d'offres à retourner
     * @return Top offres
     */
    public List<OffreStatistiquesDTO> getTopOffresByCandidatures(int limit) {
        log.info("🏆 Fetching top {} offers by candidatures", limit);
        try {
            List<OffreStatistiquesDTO> offres = offreEmploiRepository.findOffresAvecStatistiques();
            return offres.stream().limit(limit).toList();
        } catch (Exception e) {
            log.error("❌ Error fetching top offers: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch top offers", e);
        }
    }
}
