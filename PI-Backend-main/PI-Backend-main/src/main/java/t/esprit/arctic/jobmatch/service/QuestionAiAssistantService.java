package t.esprit.arctic.jobmatch.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import t.esprit.arctic.jobmatch.dto.AiQuestionGenerateRequestDTO;
import t.esprit.arctic.jobmatch.dto.ChoixDTO;
import t.esprit.arctic.jobmatch.dto.QuestionDTO;
import t.esprit.arctic.jobmatch.entity.Entretien;
import t.esprit.arctic.jobmatch.repository.EntretienRepository;

import java.util.*;

@Service
public class QuestionAiAssistantService {

    private final EntretienRepository entretienRepository;
    private final ObjectMapper objectMapper;

    @Value("${ai.generator.base-url:http://localhost:8000}")
    private String aiBaseUrl;

    @Value("${ai.generator.generate-path:/generate}")
    private String aiGeneratePath;

    @Value("${ml.internal.api-key:}")
    private String mlInternalApiKey;

    public QuestionAiAssistantService(EntretienRepository entretienRepository, ObjectMapper objectMapper) {
        this.entretienRepository = entretienRepository;
        this.objectMapper = objectMapper;
    }

    public List<QuestionDTO> generateSuggestions(Long entretienId, AiQuestionGenerateRequestDTO request) {
        Entretien entretien = entretienRepository.findById(entretienId)
                .orElseThrow(() -> new RuntimeException("Entretien non trouvé"));

        if (entretien.isCompleted()) {
            throw new RuntimeException("Impossible de générer des questions pour un entretien terminé");
        }

        Map<String, Object> payload = buildGeneratorPayload(entretien, request);

        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (StringUtils.hasText(mlInternalApiKey)) {
                headers.set("X-Internal-Api-Key", mlInternalApiKey);
            }

            String endpoint = buildEndpointUrl();
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                    endpoint,
                    HttpMethod.POST,
                    entity,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );

            List<Map<String, Object>> body = response.getBody();
            if (body == null || body.isEmpty()) {
                return generateLocalSuggestions(entretien, request);
            }

            String fallbackNiveau = (String) payload.get("niveau");
            List<QuestionDTO> suggestions = new ArrayList<>();
            int ordre = 1;
            for (Map<String, Object> item : body) {
                QuestionDTO dto = mapGeneratedQuestion(item, fallbackNiveau, ordre++);
                if (dto != null) {
                    suggestions.add(dto);
                }
            }

            if (suggestions.isEmpty()) {
                return generateLocalSuggestions(entretien, request);
            }

            return suggestions;
        } catch (RestClientException ex) {
            return generateLocalSuggestions(entretien, request);
        }
    }

    private List<QuestionDTO> generateLocalSuggestions(Entretien entretien, AiQuestionGenerateRequestDTO request) {
        String theme = request != null && StringUtils.hasText(request.getTheme())
                ? request.getTheme().trim()
                : (StringUtils.hasText(entretien.getTitre()) ? entretien.getTitre().trim() : "le sujet de l'entretien");

        String niveau = request != null && StringUtils.hasText(request.getNiveau())
                ? request.getNiveau().trim().toUpperCase(Locale.ROOT)
                : "INTERMEDIAIRE";

        String type = normalizeTypeFromGenerator(request != null ? request.getType() : null);
        int nombre = clampInt(request != null ? request.getNombre() : null, 1, 10, 3);

        List<QuestionDTO> suggestions = new ArrayList<>();
        for (int i = 1; i <= nombre; i++) {
            QuestionDTO dto = new QuestionDTO();
            dto.setContenu(buildLocalQuestion(theme, niveau, type, i));
            dto.setType(type);
            dto.setNiveau(niveau);
            dto.setOrdre(i);
            dto.setActif(true);
            dto.setPoints(1);
            dto.setChoix(buildLocalChoices(type, theme));
            suggestions.add(dto);
        }

        return suggestions;
    }

    private String buildLocalQuestion(String theme, String niveau, String type, int index) {
        String normalizedType = StringUtils.hasText(type) ? type.toUpperCase(Locale.ROOT) : "QCM";
        return switch (normalizedType) {
            case "VRAI_FAUX" -> String.format("%s: affirmation %d sur %s est-elle vraie ou fausse ?", niveau, index, theme);
            case "QCU" -> String.format("%s: quelle est l'option unique correcte concernant %s ?", niveau, theme);
            default -> {
                String[] templates = new String[] {
                    String.format("%s: quelle est la meilleure réponse concernant %s ?", niveau, theme),
                    String.format("%s: parmi les options suivantes, laquelle est correcte pour %s ?", niveau, theme),
                    String.format("%s: sélectionnez la bonne pratique relative à %s", niveau, theme),
                    String.format("%s: quelle est la réponse la plus appropriée sur %s ?", niveau, theme),
                    String.format("%s: identifiez la bonne affirmation concernant %s", niveau, theme)
                };
                yield templates[(index - 1) % templates.length];
            }
        };
    }

    private List<ChoixDTO> buildLocalChoices(String type, String theme) {
        String normalizedType = StringUtils.hasText(type) ? type.toUpperCase(Locale.ROOT) : "QCM";
        List<ChoixDTO> choices = new ArrayList<>();

        if ("VRAI_FAUX".equals(normalizedType)) {
            choices.add(new ChoixDTO(null, "VRAI", true, 1));
            choices.add(new ChoixDTO(null, "FAUX", false, 2));
            return choices;
        }

        if ("QCU".equals(normalizedType)) {
            choices.add(new ChoixDTO(null, "Bonne pratique 1 sur " + theme, true, 1));
            choices.add(new ChoixDTO(null, "Bonne pratique 2", false, 2));
            choices.add(new ChoixDTO(null, "Bonne pratique 3", false, 3));
            return choices;
        }

        // QCM avec variantes contextuelles basées sur Random
        int randomIndex = (int)(Math.random() * 4);
        switch (randomIndex) {
            case 0:
                choices.add(new ChoixDTO(null, "Approche standard", true, 1));
                choices.add(new ChoixDTO(null, "Approche optimisée", false, 2));
                choices.add(new ChoixDTO(null, "Mauvaise pratique", false, 3));
                choices.add(new ChoixDTO(null, "Non recommandée", false, 4));
                break;
            case 1:
                choices.add(new ChoixDTO(null, "Méthode A", true, 1));
                choices.add(new ChoixDTO(null, "Méthode B", false, 2));
                choices.add(new ChoixDTO(null, "Méthode C", false, 3));
                break;
            case 2:
                choices.add(new ChoixDTO(null, "Correcte et optimale", true, 1));
                choices.add(new ChoixDTO(null, "Correcte mais inefficace", false, 2));
                choices.add(new ChoixDTO(null, "Incorrecte", false, 3));
                break;
            default:
                choices.add(new ChoixDTO(null, "Solution 1", true, 1));
                choices.add(new ChoixDTO(null, "Solution 2", false, 2));
                choices.add(new ChoixDTO(null, "Solution 3", false, 3));
        }
        return choices;
    }

    private Map<String, Object> buildGeneratorPayload(Entretien entretien, AiQuestionGenerateRequestDTO request) {
        String domaine = entretien.getDomaine() != null ? entretien.getDomaine().name() : "AUTRE";
        String categorie = sanitizeUpper(
                request != null ? request.getCategorie() : null,
                entretien.getCategorie() != null ? entretien.getCategorie().name() : "TECHNIQUE"
        );
        String niveau = sanitizeUpper(
                request != null ? request.getNiveau() : null,
                "INTERMEDIAIRE"
        );
        String type = normalizeTypeForGenerator(request != null ? request.getType() : null);

        int nombre = clampInt(request != null ? request.getNombre() : null, 1, 10, 3);
        double temperature = clampDouble(request != null ? request.getTemperature() : null, 0.1, 1.2, 0.7);

        String theme = request != null ? request.getTheme() : null;
        if (!StringUtils.hasText(theme)) {
            theme = entretien.getTitre();
        }
        if (!StringUtils.hasText(theme)) {
            theme = "general";
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("domaine", domaine);
        payload.put("categorie", categorie);
        payload.put("niveau", niveau);
        payload.put("type", type);
        payload.put("theme", theme.trim());
        payload.put("nombre", nombre);
        payload.put("temperature", temperature);

        return payload;
    }

    private String buildEndpointUrl() {
        String base = aiBaseUrl == null ? "http://localhost:8000" : aiBaseUrl.trim();
        String path = aiGeneratePath == null ? "/generate" : aiGeneratePath.trim();

        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        if (!path.startsWith("/")) {
            path = "/" + path;
        }
        return base + path;
    }

    private QuestionDTO mapGeneratedQuestion(Map<String, Object> item, String fallbackNiveau, int ordre) {
        String contenu = asTrimmedText(item.get("contenu"));
        if (!StringUtils.hasText(contenu)) {
            return null;
        }

        String type = normalizeTypeFromGenerator(asTrimmedText(item.get("type")));
        if (!StringUtils.hasText(type)) {
            type = "QCM";
        }

        String niveau = sanitizeUpper(asTrimmedText(item.get("niveau")), fallbackNiveau);
        int points = clampInt(asInteger(item.get("points")), 1, 100, 1);

        List<ChoixDTO> choix = mapChoix(item.get("choix"), type);
        enforceChoiceRules(choix, type);

        QuestionDTO dto = new QuestionDTO();
        dto.setContenu(contenu);
        dto.setType(type);
        dto.setNiveau(niveau);
        dto.setOrdre(ordre);
        dto.setActif(true);
        dto.setPoints(points);
        dto.setChoix(choix);
        return dto;
    }

    private List<ChoixDTO> mapChoix(Object rawChoix, String type) {
        List<ChoixDTO> result = new ArrayList<>();
        if (!(rawChoix instanceof List<?> rawList)) {
            return result;
        }

        int ordre = 1;
        for (Object row : rawList) {
            if (row == null) {
                continue;
            }

            String texte;
            boolean correcte = false;
            int ordreChoix = ordre;

            if (row instanceof String textChoice) {
                texte = textChoice.trim();
            } else {
                Map<String, Object> asMap = objectMapper.convertValue(row, new TypeReference<Map<String, Object>>() {});
                texte = asTrimmedText(firstNonNull(asMap.get("texte"), asMap.get("contenu"), asMap.get("text")));

                Object correctRaw = firstNonNull(asMap.get("correcte"), asMap.get("correct"), asMap.get("isCorrecte"));
                correcte = asBoolean(correctRaw);

                Integer ordreRaw = asInteger(asMap.get("ordre"));
                if (ordreRaw != null && ordreRaw > 0) {
                    ordreChoix = ordreRaw;
                }
            }

            if (!StringUtils.hasText(texte)) {
                continue;
            }

            result.add(new ChoixDTO(null, texte, correcte, ordreChoix));
            ordre++;
        }

        if ("VRAI_FAUX".equals(type) && result.isEmpty()) {
            result.add(new ChoixDTO(null, "VRAI", true, 1));
            result.add(new ChoixDTO(null, "FAUX", false, 2));
        }

        return result;
    }

    private void enforceChoiceRules(List<ChoixDTO> choix, String type) {
        if ("VRAI_FAUX".equals(type)) {
            if (choix.size() < 2) {
                choix.clear();
                choix.add(new ChoixDTO(null, "VRAI", true, 1));
                choix.add(new ChoixDTO(null, "FAUX", false, 2));
                return;
            }

            if (choix.stream().noneMatch(ChoixDTO::isCorrecte)) {
                choix.get(0).setCorrecte(true);
                for (int i = 1; i < choix.size(); i++) {
                    choix.get(i).setCorrecte(false);
                }
            }
            return;
        }

        if (choix.isEmpty()) {
            return;
        }

        if ("QCU".equals(type)) {
            boolean found = false;
            for (ChoixDTO c : choix) {
                if (!found && c.isCorrecte()) {
                    found = true;
                } else {
                    c.setCorrecte(false);
                }
            }
            if (!found) {
                choix.get(0).setCorrecte(true);
            }
            return;
        }

        // QCM: s'il n'y a aucune réponse correcte, on en force une.
        if (choix.stream().noneMatch(ChoixDTO::isCorrecte)) {
            choix.get(0).setCorrecte(true);
        }
    }

    private String normalizeTypeForGenerator(String raw) {
        String type = sanitizeUpper(raw, "QCM");
        if ("VRAI_FAUX".equals(type)) {
            return "VF";
        }
        return type;
    }

    private String normalizeTypeFromGenerator(String raw) {
        String type = sanitizeUpper(raw, "QCM");
        if ("VF".equals(type) || "VRAI/FAUX".equals(type) || "TRUE_FALSE".equals(type)) {
            return "VRAI_FAUX";
        }
        if ("QCU".equals(type) || "QCM".equals(type) || "VRAI_FAUX".equals(type)) {
            return type;
        }
        return "QCM";
    }

    private String sanitizeUpper(String raw, String fallback) {
        if (!StringUtils.hasText(raw)) {
            return fallback;
        }
        return raw.trim().toUpperCase(Locale.ROOT);
    }

    private int clampInt(Integer value, int min, int max, int fallback) {
        int target = value == null ? fallback : value;
        if (target < min) {
            return min;
        }
        if (target > max) {
            return max;
        }
        return target;
    }

    private double clampDouble(Double value, double min, double max, double fallback) {
        double target = value == null ? fallback : value;
        if (target < min) {
            return min;
        }
        if (target > max) {
            return max;
        }
        return target;
    }

    private String asTrimmedText(Object value) {
        if (value == null) {
            return "";
        }
        return String.valueOf(value).trim();
    }

    private Integer asInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number n) {
            return n.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value).trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private boolean asBoolean(Object value) {
        if (value instanceof Boolean b) {
            return b;
        }
        if (value == null) {
            return false;
        }
        String s = String.valueOf(value).trim().toLowerCase(Locale.ROOT);
        return "true".equals(s) || "1".equals(s) || "yes".equals(s) || "oui".equals(s);
    }

    private Object firstNonNull(Object... candidates) {
        for (Object candidate : candidates) {
            if (candidate != null) {
                return candidate;
            }
        }
        return null;
    }
}
