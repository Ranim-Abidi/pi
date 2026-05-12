package t.esprit.arctic.jobmatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import t.esprit.arctic.jobmatch.entity.VideoProgression;
import java.util.List;
import java.util.Optional;

public interface VideoProgressionRepository
        extends JpaRepository<VideoProgression, Long> {

    List<VideoProgression> findByInscriptionId(Long inscriptionId);

    Optional<VideoProgression> findByInscriptionIdAndVideoId(
            Long inscriptionId, String videoId);

    long countByInscriptionIdAndVuCompleteTrue(Long inscriptionId);
    long countByInscriptionIdAndQuizReussiTrue(Long inscriptionId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(DISTINCT v.videoId) FROM VideoProgression v WHERE v.inscriptionId = :inscriptionId AND v.vuComplete = true")
    long countDistinctVideoIdByInscriptionIdAndVuCompleteTrue(@org.springframework.data.repository.query.Param("inscriptionId") Long inscriptionId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(DISTINCT v.videoId) FROM VideoProgression v WHERE v.inscriptionId = :inscriptionId AND v.formationId = :formationId AND v.vuComplete = true")
    long countDistinctVideoIdByInscriptionIdAndFormationIdAndVuCompleteTrue(@org.springframework.data.repository.query.Param("inscriptionId") Long inscriptionId, @org.springframework.data.repository.query.Param("formationId") Long formationId);
}