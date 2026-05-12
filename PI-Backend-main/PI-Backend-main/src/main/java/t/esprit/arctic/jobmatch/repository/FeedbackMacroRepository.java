package t.esprit.arctic.jobmatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import t.esprit.arctic.jobmatch.entity.FeedbackMacro;
import java.util.Optional;

public interface FeedbackMacroRepository extends JpaRepository<FeedbackMacro, Long> {
    boolean existsByInscriptionId(Long inscriptionId);
    Optional<FeedbackMacro> findByInscriptionId(Long inscriptionId);
    java.util.List<FeedbackMacro> findByParcoursId(Long parcoursId);
}
