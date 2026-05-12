package t.esprit.arctic.jobmatch.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class OffreSalairePredictionService {

    /** Dédié à salary_api.py (Flask) — défaut 5000. */
    @Value("${salary.ml.url:http://127.0.0.1:5000}")
    private String salaryMlUrl;

    public String predictSalaire(
            String titre,
            String description,
            String entreprise,
            String location,
            String typeContrat,
            List<String> competences) {

        Map<String, Object> body = new HashMap<>();
        body.put("titre", titre);
        body.put("description", description);
        body.put("entreprise", entreprise);
        body.put("location", location);
        body.put("typeContrat", typeContrat);
        body.put("competences", competences);

        RestTemplate rest = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> req = new HttpEntity<>(body, headers);

        String base = normalizeBase(salaryMlUrl);
        String[] paths = new String[] { "/predict-salary", "/api/predict-salary" };

        for (String path : paths) {
            try {
                ResponseEntity<Map> response = rest.postForEntity(base + path, req, Map.class);
                Map<String, Object> resBody = response.getBody();
                if (resBody != null && resBody.containsKey("predicted_salary")) {
                    return resBody.get("predicted_salary").toString();
                }
            } catch (HttpStatusCodeException ignored) {
                // Essayer l'autre chemin ou tomber en repli.
            } catch (Exception ignored) {
                // idem
            }
        }

        return fallbackSalary(titre, location, typeContrat, competences);
    }

    private static String normalizeBase(String url) {
        if (url == null || url.isBlank()) {
            return "http://127.0.0.1:5000";
        }
        String b = url.trim();
        return b.endsWith("/") ? b.substring(0, b.length() - 1) : b;
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
