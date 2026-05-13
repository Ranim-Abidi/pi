package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import t.esprit.arctic.jobmatch.dto.AiQuestionGenerateRequestDTO;
import t.esprit.arctic.jobmatch.dto.ChoixDTO;
import t.esprit.arctic.jobmatch.dto.QuestionDTO;
import t.esprit.arctic.jobmatch.entity.Entretien;
import t.esprit.arctic.jobmatch.repository.EntretienRepository;

import java.util.*;

@Service
@RequiredArgsConstructor
public class QuestionAiAssistantService {

    private final EntretienRepository entretienRepository;
    public List<QuestionDTO> generateSuggestions(Long entretienId, AiQuestionGenerateRequestDTO request) {
        Entretien entretien = entretienRepository.findById(entretienId)
                .orElseThrow(() -> new RuntimeException("Entretien non trouvé"));

        if (entretien.isCompleted()) {
            throw new RuntimeException("Impossible de générer des questions pour un entretien terminé");
        }

        return generateLocalSuggestions(entretien, request);
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
}
