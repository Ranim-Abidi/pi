package t.esprit.arctic.jobmatch.service;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class OffreSalairePredictionService {

    public String predictSalaire(
            String titre,
            String description,
            String entreprise,
            String location,
            String typeContrat,
            List<String> competences) {
        return fallbackSalary(titre, location, typeContrat, competences);
    }

    private String fallbackSalary(String titre, String location, String typeContrat, List<String> competences) {
        int base = 1800;

        String safeTitle = titre == null ? "" : titre.toLowerCase();
        String safeLocation = location == null ? "" : location.toLowerCase();
        String safeContract = typeContrat == null ? "" : typeContrat.toUpperCase();
        String skillsText = competences == null ? "" : String.join(" ", competences).toLowerCase();

        if (safeTitle.contains("senior") || safeTitle.contains("lead")) {
            base += 900;
        }
        if (safeTitle.contains("data") || safeTitle.contains("ml") || safeTitle.contains("ai") || safeTitle.contains("devops")) {
            base += 700;
        }
        if (skillsText.contains("cloud") || skillsText.contains("kubernetes") || skillsText.contains("docker") || skillsText.contains("spring")) {
            base += 350;
        }
        if ("FREELANCE".equals(safeContract)) {
            base += 400;
        }
        if ("tunis".equals(safeLocation) || "ariana".equals(safeLocation) || "ben arous".equals(safeLocation)
                || "ghazella".equals(safeLocation)) {
            base += 200;
        }

        int rounded = (int) (Math.round(base / 50.0) * 50);
        return String.valueOf(Math.max(rounded, 1200));
    }
}
