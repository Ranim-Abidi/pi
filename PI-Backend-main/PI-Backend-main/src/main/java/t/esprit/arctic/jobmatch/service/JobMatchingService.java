package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import t.esprit.arctic.jobmatch.dto.OffreRecommandeeDTO;
import t.esprit.arctic.jobmatch.entity.OffreEmploi;
import t.esprit.arctic.jobmatch.repository.OffreEmploiRepository;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class JobMatchingService {

    private final OffreEmploiRepository offreEmploiRepository;

    /**
     * Offres recommandées (heuristique locale uniquement — service ML HTTP retiré).
     */
    public List<OffreRecommandeeDTO> getRecommendations(String competences, String userId) {
        List<OffreEmploi> recruiterOffers = offreEmploiRepository.findByStatut("ACTIVE");
        String safeComp = competences == null ? "" : competences;
        return convertToFallbackOffers(recruiterOffers, safeComp);
    }

    private String detectDomain(OffreEmploi offre) {
        String allSkills = String.join(" ", offre.getCompetencesRequises()).toLowerCase();

        if (allSkills.contains("python") || allSkills.contains("java") ||
                allSkills.contains("javascript") || allSkills.contains("react") ||
                allSkills.contains("spring") || allSkills.contains("sql")) {
            return "informatique";
        }
        if (allSkills.contains("infirmier") || allSkills.contains("soins") ||
                allSkills.contains("patient") || allSkills.contains("clinique")) {
            return "sante";
        }
        if (allSkills.contains("comptable") || allSkills.contains("finance") ||
                allSkills.contains("audit") || allSkills.contains("bilan")) {
            return "finance";
        }
        if (allSkills.contains("marketing") || allSkills.contains("seo") ||
                allSkills.contains("social") || allSkills.contains("community")) {
            return "marketing";
        }
        return "general";
    }

    private List<OffreRecommandeeDTO> convertToFallbackOffers(List<OffreEmploi> offres, String competences) {
        List<OffreRecommandeeDTO> fallback = new ArrayList<>();
        String[] candidateSkills = competences.toLowerCase().split("\\s+");
        Set<String> candidateSet = new HashSet<>(Arrays.asList(candidateSkills));

        for (OffreEmploi offre : offres) {
            Set<String> jobSkills = new HashSet<>();
            for (String skill : offre.getCompetencesRequises()) {
                jobSkills.add(skill.toLowerCase());
            }

            Set<String> common = new HashSet<>(jobSkills);
            common.retainAll(candidateSet);
            double score = (common.size() / (double) Math.max(offre.getCompetencesRequises().size(), 1)) * 100;

            OffreRecommandeeDTO dto = new OffreRecommandeeDTO();
            dto.setJobId(String.valueOf(offre.getId()));
            dto.setJobTitle(offre.getTitre());
            dto.setJobDomain(detectDomain(offre));
            dto.setJobLocation(offre.getLocation());
            dto.setJobSkills(String.join(", ", offre.getCompetencesRequises()));
            dto.setScoreMatch(score);
            dto.setSource("recruiter");
            dto.setRaison(common.size() + " compétence(s) commune(s)");
            fallback.add(dto);
        }

        fallback.sort((a, b) -> Double.compare(b.getScoreMatch(), a.getScoreMatch()));
        return fallback.stream().limit(10).collect(Collectors.toList());
    }
}
