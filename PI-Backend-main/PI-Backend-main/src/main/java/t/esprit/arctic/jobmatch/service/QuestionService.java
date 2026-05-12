package t.esprit.arctic.jobmatch.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import t.esprit.arctic.jobmatch.dto.ChoixDTO;
import t.esprit.arctic.jobmatch.dto.QuestionDTO;
import t.esprit.arctic.jobmatch.entity.*;
import t.esprit.arctic.jobmatch.repository.QuestionRepository;
import t.esprit.arctic.jobmatch.repository.EntretienRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class QuestionService {

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private EntretienRepository entretienRepository;

    public QuestionDTO createQuestion(QuestionDTO questionDTO, Long entretienId) {
        // Validation métier
        validateQuestionData(questionDTO, entretienId);

        Entretien entretien = entretienRepository.findById(entretienId)
                .orElseThrow(() -> new RuntimeException("Entretien non trouvé"));

        // Vérifier que l'entretien n'est pas terminé
        if (entretien.isCompleted()) {
            throw new RuntimeException("Impossible d'ajouter des questions à un entretien terminé");
        }

        Question question = new Question();
        question.setContenu(questionDTO.getContenu());
        question.setType(TypeQuestion.valueOf(questionDTO.getType()));
        question.setNiveau(questionDTO.getNiveau());
        question.setEntretien(entretien);
        question.setOrdre(questionDTO.getOrdre());
        question.setActif(true);
        question.setPoints(questionDTO.getPoints());

        if (questionDTO.getChoix() != null && !questionDTO.getChoix().isEmpty()) {
            List<Choix> choixEntities = questionDTO.getChoix().stream().map(dto -> {
                Choix choix = new Choix();
                choix.setTexte(dto.getTexte());
                choix.setCorrecte(dto.isCorrecte());
                choix.setOrdre(dto.getOrdre());
                choix.setQuestion(question);
                return choix;
            }).collect(Collectors.toList());
            question.setChoix(choixEntities);
        }

        Question saved = questionRepository.save(question);
        return convertToDTO(saved);
    }

    public List<QuestionDTO> getQuestionsByEntretien(Long entretienId) {
        Entretien entretien = entretienRepository.findById(entretienId)
                .orElseThrow(() -> new RuntimeException("Entretien non trouvé"));
        return questionRepository.findByEntretienOrderByOrdre(entretien).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<QuestionDTO> getQuestionsByDomaine(Long entretienId, String domaineName) {
        Entretien entretien = entretienRepository.findById(entretienId)
                .orElseThrow(() -> new RuntimeException("Entretien non trouvé"));

        final DomaineType domaineType;
        try {
            domaineType = DomaineType.valueOf(domaineName.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Domaine invalide: " + domaineName);
        }

        return questionRepository.findByEntretienOrderByOrdre(entretien).stream()
                .filter(q -> q.getEntretien().getDomaine() != null && q.getEntretien().getDomaine().equals(domaineType))
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public QuestionDTO getQuestion(Long id) {
        return questionRepository.findById(id)
                .map(this::convertToDTO)
                .orElse(null);
    }

    public QuestionDTO updateQuestion(Long id, QuestionDTO questionDTO) {
        return questionRepository.findById(id).map(question -> {
            // Validate before updating
            validateQuestionData(questionDTO, question.getEntretien().getId());
            
            question.setContenu(questionDTO.getContenu());
            question.setType(TypeQuestion.valueOf(questionDTO.getType()));
            question.setNiveau(questionDTO.getNiveau());
            question.setOrdre(questionDTO.getOrdre());
            question.setActif(questionDTO.isActif());
            question.setPoints(questionDTO.getPoints());
            
            // Le domaine de la question est hérité de l'entretien parent : ne mettez pas à jour ici.
            
            // Update choix
            if (questionDTO.getChoix() != null) {
                if (question.getChoix() == null) {
                    question.setChoix(new java.util.ArrayList<>());
                } else {
                    question.getChoix().clear();
                }
                for (ChoixDTO dto : questionDTO.getChoix()) {
                    Choix choix = new Choix();
                    choix.setTexte(dto.getTexte());
                    choix.setCorrecte(dto.isCorrecte());
                    choix.setOrdre(dto.getOrdre());
                    choix.setQuestion(question);
                    question.getChoix().add(choix);
                }
            } else {
                if (question.getChoix() != null) {
                    question.getChoix().clear();
                }
            }

            Question updated = questionRepository.save(question);
            return convertToDTO(updated);
        }).orElseThrow(() -> new RuntimeException("Question non trouvée avec l'ID: " + id));
    }

    public void deleteQuestion(Long id) {
        questionRepository.deleteById(id);
    }

    private QuestionDTO convertToDTO(Question question) {
        QuestionDTO dto = new QuestionDTO();
        dto.setId(question.getId());
        dto.setContenu(question.getContenu());
        dto.setType(question.getType().toString());
        dto.setNiveau(question.getNiveau());
        dto.setOrdre(question.getOrdre());
        dto.setActif(question.isActif());
        dto.setPoints(question.getPoints());
        // domaine est défini sur Entretien; ne pas exposer ici

        if (question.getChoix() != null) {
            dto.setChoix(question.getChoix().stream()
                    .map(this::convertChoixToDTO)
                    .collect(Collectors.toList()));
        }
        return dto;
    }

    private ChoixDTO convertChoixToDTO(Choix choix) {
        return new ChoixDTO(
            choix.getId(),
            choix.getTexte(),
            choix.isCorrecte(),
            choix.getOrdre()
        );
    }

    private void validateQuestionData(QuestionDTO questionDTO, Long entretienId) {
        // Vérifier que l'entretien existe
        Entretien entretien = entretienRepository.findById(entretienId)
                .orElseThrow(() -> new RuntimeException("Entretien non trouvé"));

        // Vérifier que l'entretien n'est pas terminé
        if (entretien.isCompleted()) {
            throw new RuntimeException("Impossible de modifier les questions d'un entretien terminé");
        }

        // Validation selon le type de question
        TypeQuestion typeQuestion = TypeQuestion.valueOf(questionDTO.getType());

        if (questionDTO.getChoix() != null) {
            switch (typeQuestion) {
                case QCM:
                    // QCM doit avoir au moins 3 choix et au moins 1 correct
                    if (questionDTO.getChoix().size() < 3) {
                        throw new IllegalArgumentException("Une question QCM doit avoir au moins 3 choix");
                    }
                    long correctCount = questionDTO.getChoix().stream().filter(ChoixDTO::isCorrecte).count();
                    if (correctCount < 1) {
                        throw new IllegalArgumentException("Une question QCM doit avoir au moins 1 réponse correcte");
                    }
                    break;

                case QCU:
                    // QCU doit avoir au moins 2 choix et exactement 1 correct
                    if (questionDTO.getChoix().size() < 2) {
                        throw new IllegalArgumentException("Une question QCU doit avoir au moins 2 choix");
                    }
                    correctCount = questionDTO.getChoix().stream().filter(ChoixDTO::isCorrecte).count();
                    if (correctCount != 1) {
                        throw new IllegalArgumentException("Une question QCU doit avoir exactement 1 réponse correcte");
                    }
                    break;

                case VRAI_FAUX:
                    // Vrai/Faux doit avoir exactement 2 choix et 1 correct
                    if (questionDTO.getChoix().size() != 2) {
                        throw new IllegalArgumentException("Une question Vrai/Faux doit avoir exactement 2 choix");
                    }
                    correctCount = questionDTO.getChoix().stream().filter(ChoixDTO::isCorrecte).count();
                    if (correctCount != 1) {
                        throw new IllegalArgumentException("Une question Vrai/Faux doit avoir exactement 1 réponse correcte");
                    }
                    break;
            }

            // Vérifier que tous les choix ont du texte
            for (ChoixDTO choix : questionDTO.getChoix()) {
                if (choix.getTexte() == null || choix.getTexte().trim().isEmpty()) {
                    throw new IllegalArgumentException("Tous les choix doivent avoir du texte");
                }
                if (choix.getTexte().length() > 500) {
                    throw new IllegalArgumentException("Le texte d'un choix ne peut pas dépasser 500 caractères");
                }
            }
        }

        // Vérifier l'ordre (doit être positif)
        if (questionDTO.getOrdre() <= 0) {
            throw new IllegalArgumentException("L'ordre de la question doit être supérieur à 0");
        }

        // Vérifier la longueur du contenu
        if (questionDTO.getContenu() != null && questionDTO.getContenu().length() > 1000) {
            throw new IllegalArgumentException("Le contenu de la question ne peut pas dépasser 1000 caractères");
        }
    }
}

