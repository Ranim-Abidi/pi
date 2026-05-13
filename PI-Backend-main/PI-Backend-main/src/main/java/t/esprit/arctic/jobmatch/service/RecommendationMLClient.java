package t.esprit.arctic.jobmatch.service;

import org.springframework.stereotype.Service;
import t.esprit.arctic.jobmatch.entity.Candidat;
import t.esprit.arctic.jobmatch.entity.Competence;
import t.esprit.arctic.jobmatch.entity.Formation;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Formation recommendations without outbound Python/Flask (slim deployment).
 */
@Service
public class RecommendationMLClient {

    public List<Map<String, Object>> getRecommendations(Candidat candidat, List<Formation> formationsDisponibles) {
        Set<String> candSkills = new HashSet<>();
        if (candidat.getCompetences() != null) {
            candSkills = candidat.getCompetences().stream()
                    .map(Competence::getNom)
                    .filter(Objects::nonNull)
                    .map(s -> s.toLowerCase(Locale.ROOT))
                    .collect(Collectors.toSet());
        }

        List<Map<String, Object>> scored = new ArrayList<>();
        for (Formation f : formationsDisponibles) {
            Set<String> formSkills = new HashSet<>();
            if (f.getCompetences() != null) {
                formSkills = f.getCompetences().stream()
                        .map(Competence::getNom)
                        .filter(Objects::nonNull)
                        .map(s -> s.toLowerCase(Locale.ROOT))
                        .collect(Collectors.toSet());
            }
            Set<String> inter = new HashSet<>(candSkills);
            inter.retainAll(formSkills);
            double score = formSkills.isEmpty() ? 0.0 : (100.0 * inter.size() / formSkills.size());

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", f.getId());
            row.put("titre", f.getTitre());
            row.put("score", Math.round(score));
            row.put("matched_skills", new ArrayList<>(inter));
            scored.add(row);
        }

        scored.sort((a, b) -> Double.compare(
                ((Number) b.get("score")).doubleValue(),
                ((Number) a.get("score")).doubleValue()
        ));
        return scored;
    }
}
