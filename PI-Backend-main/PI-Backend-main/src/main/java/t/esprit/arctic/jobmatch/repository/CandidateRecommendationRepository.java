package t.esprit.arctic.jobmatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import t.esprit.arctic.jobmatch.entity.CandidateRecommendation;
import t.esprit.arctic.jobmatch.entity.Candidat;
import t.esprit.arctic.jobmatch.entity.OffreEmploi;

import java.util.List;
import java.util.Optional;

@Repository
public interface CandidateRecommendationRepository extends JpaRepository<CandidateRecommendation, Long> {

    /**
     * Find recommendation for a specific candidate-offre pair
     */
    Optional<CandidateRecommendation> findByOffreAndCandidat(OffreEmploi offre, Candidat candidat);

    /**
     * Find all recommendations for a specific offre, ordered by score
     */
    @Query("SELECT cr FROM CandidateRecommendation cr WHERE cr.offre.id = :offreId ORDER BY cr.scoreglobal DESC")
    List<CandidateRecommendation> findTopCandidatesForOffre(@Param("offreId") Long offreId);

    /**
     * Find all recommendations for an offre with minimum score
     */
    @Query("SELECT cr FROM CandidateRecommendation cr WHERE cr.offre.id = :offreId AND cr.scoreglobal >= :minScore ORDER BY cr.scoreglobal DESC")
    List<CandidateRecommendation> findTopCandidatesForOffreWithMinScore(
            @Param("offreId") Long offreId,
            @Param("minScore") Double minScore);

    /**
     * Find all recommendations for a candidate, ordered by score
     */
    @Query("SELECT cr FROM CandidateRecommendation cr WHERE cr.candidat.id = :candidatId ORDER BY cr.scoreglobal DESC")
    List<CandidateRecommendation> findRecommendedOffresForCandidat(@Param("candidatId") Long candidatId);

    /**
     * Find recommendations by recommendation level for an offre
     */
    @Query("SELECT cr FROM CandidateRecommendation cr WHERE cr.offre.id = :offreId AND cr.recommendationLevel = :level ORDER BY cr.scoreglobal DESC")
    List<CandidateRecommendation> findByOffreAndRecommendationLevel(
            @Param("offreId") Long offreId,
            @Param("level") String level);

    /**
     * Count recommendations by level for an offre
     */
    @Query("SELECT COUNT(cr) FROM CandidateRecommendation cr WHERE cr.offre.id = :offreId AND cr.recommendationLevel = :level")
    long countByOffreAndLevel(@Param("offreId") Long offreId, @Param("level") String level);

    /**
     * Check if recommendation exists for a pair
     */
    @Query("SELECT COUNT(cr) > 0 FROM CandidateRecommendation cr WHERE cr.offre.id = :offreId AND cr.candidat.id = :candidatId")
    boolean existsByOffreAndCandidat(@Param("offreId") Long offreId, @Param("candidatId") Long candidatId);
}
