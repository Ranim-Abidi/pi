package t.esprit.arctic.jobmatch.repository;

import t.esprit.arctic.jobmatch.entity.EmotionFrame;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmotionFrameRepository extends JpaRepository<EmotionFrame, Long> {

    List<EmotionFrame> findByEmotionAnalysisId(Long emotionAnalysisId);

    List<EmotionFrame> findByEmotionAnalysisIdOrderByFrameNumberAsc(Long emotionAnalysisId);
}
