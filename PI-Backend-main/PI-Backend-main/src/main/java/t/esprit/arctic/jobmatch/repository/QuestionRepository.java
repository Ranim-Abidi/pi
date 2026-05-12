package t.esprit.arctic.jobmatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import t.esprit.arctic.jobmatch.entity.Question;
import t.esprit.arctic.jobmatch.entity.Entretien;
import t.esprit.arctic.jobmatch.entity.TypeQuestion;

import java.util.List;

@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByEntretien(Entretien entretien);
    List<Question> findByType(TypeQuestion type);
    List<Question> findByEntretienOrderByOrdre(Entretien entretien);
}

