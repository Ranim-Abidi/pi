package t.esprit.arctic.jobmatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import t.esprit.arctic.jobmatch.entity.Feedback;
import java.util.List;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    @Query("SELECT f FROM Feedback f LEFT JOIN FETCH f.formation LEFT JOIN FETCH f.candidat WHERE f.formation.id = :formationId")
    List<Feedback> findByFormationId(@Param("formationId") Long formationId);

    @Query("SELECT f FROM Feedback f LEFT JOIN FETCH f.formation LEFT JOIN FETCH f.candidat WHERE f.candidat.id = :candidatId")
    List<Feedback> findByCandidatId(@Param("candidatId") Long candidatId);

    @Query("SELECT f FROM Feedback f LEFT JOIN FETCH f.formation LEFT JOIN FETCH f.candidat WHERE f.participation.id = :participationId")
    List<Feedback> findByParticipationId(@Param("participationId") Long participationId);

    @Query("SELECT f FROM Feedback f LEFT JOIN FETCH f.formation LEFT JOIN FETCH f.candidat WHERE f.formation.id = :formationId AND f.candidat.id = :candidatId")
    List<Feedback> findByFormationIdAndCandidatId(@Param("formationId") Long formationId, @Param("candidatId") Long candidatId);

    @Query("SELECT AVG(f.note) FROM Feedback f WHERE f.formation.id = :formationId")
    Double findNoteMoyenneByFormationId(@Param("formationId") Long formationId);

    boolean existsByFormationIdAndCandidatId(Long formationId, Long candidatId);

    @Query("""
        SELECT f FROM Feedback f 
        WHERE f.formation.id IN (
            SELECT p.niveauDebutant.id FROM ParcoursFormation p WHERE p.id = :parcoursId
        ) OR f.formation.id IN (
            SELECT p.niveauIntermediaire.id FROM ParcoursFormation p WHERE p.id = :parcoursId
        ) OR f.formation.id IN (
            SELECT p.niveauAvance.id FROM ParcoursFormation p WHERE p.id = :parcoursId
        ) OR f.formation.id IN (
            SELECT p.niveauExpert.id FROM ParcoursFormation p WHERE p.id = :parcoursId
        )
    """)
    List<Feedback> findByParcoursId(@Param("parcoursId") Long parcoursId);

    @Query("""
        SELECT f.formation.id as formationId,
               f.formation.titre as formationNom,
               AVG(f.note) as moyenneNote,
               COUNT(f.id) as nbAvis
        FROM Feedback f
        GROUP BY f.formation.id, f.formation.titre
    """)
    List<Object[]> findFormationsStats();
}