package t.esprit.arctic.jobmatch.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import t.esprit.arctic.jobmatch.dto.ChoixDTO;
import t.esprit.arctic.jobmatch.entity.Choix;
import t.esprit.arctic.jobmatch.entity.Question;
import t.esprit.arctic.jobmatch.repository.QuestionRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ChoixService {

    @Autowired
    private QuestionRepository questionRepository;

    public ChoixDTO addChoix(Long questionId, ChoixDTO choixDTO) {
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question non trouvée"));

        Choix choix = new Choix();
        choix.setTexte(choixDTO.getTexte());
        choix.setCorrecte(choixDTO.isCorrecte());
        choix.setOrdre(choixDTO.getOrdre());
        choix.setQuestion(question);

        question.getChoix().add(choix);
        questionRepository.save(question);

        return convertToDTO(choix);
    }

    public List<ChoixDTO> getChoixByQuestion(Long questionId) {
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Question non trouvée"));
        return question.getChoix().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    private ChoixDTO convertToDTO(Choix choix) {
        return new ChoixDTO(
            choix.getId(),
            choix.getTexte(),
            choix.isCorrecte(),
            choix.getOrdre()
        );
    }
}

