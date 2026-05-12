package t.esprit.arctic.jobmatch.repository;

import t.esprit.arctic.jobmatch.entity.EmotionAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmotionAnalysisRepository extends JpaRepository<EmotionAnalysis, Long> {

    Optional<EmotionAnalysis> findByEntretienId(Long entretienId);

    List<EmotionAnalysis> findByStatus(String status);

    List<EmotionAnalysis> findByEntretien_Recruteur_Id(Long recruteurId);

    List<EmotionAnalysis> findByEntretien_Candidat_Id(Long candidatId);
}
