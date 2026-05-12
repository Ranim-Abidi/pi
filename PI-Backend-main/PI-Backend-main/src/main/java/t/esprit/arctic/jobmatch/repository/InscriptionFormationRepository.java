package t.esprit.arctic.jobmatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import t.esprit.arctic.jobmatch.entity.InscriptionFormation;
import java.util.List;
import java.util.Optional;

public interface InscriptionFormationRepository
        extends JpaRepository<InscriptionFormation, Long> {

    //  JOIN FETCH sur formation, candidat
    @Query("""
        SELECT DISTINCT i FROM InscriptionFormation i
        LEFT JOIN FETCH i.formation f
        LEFT JOIN FETCH f.competences
        LEFT JOIN FETCH i.candidat c
        WHERE i.candidat.id = :candidatId
    """)
    List<InscriptionFormation> findByCandidatId(@Param("candidatId") Long candidatId);

    @Query("""
        SELECT DISTINCT i FROM InscriptionFormation i
        LEFT JOIN FETCH i.formation f
        LEFT JOIN FETCH f.competences
        LEFT JOIN FETCH i.candidat c
        WHERE i.formation.id = :formationId
    """)
    List<InscriptionFormation> findByFormationId(@Param("formationId") Long formationId);

    @Query("""
        SELECT i FROM InscriptionFormation i
        LEFT JOIN FETCH i.formation f
        LEFT JOIN FETCH i.candidat c
        WHERE i.candidat.id = :candidatId
        AND i.formation.id = :formationId
    """)
    Optional<InscriptionFormation> findByCandidatIdAndFormationId(
            @Param("candidatId") Long candidatId,
            @Param("formationId") Long formationId);

    @Query("""
        SELECT i FROM InscriptionFormation i
        WHERE i.candidat.id = :candidatId
        AND i.formation.id = :formationId
        AND ( (:parcoursId IS NULL AND i.parcoursId IS NULL) OR i.parcoursId = :parcoursId )
    """)
    Optional<InscriptionFormation> findByCandidatIdAndFormationIdAndParcoursId(
            @Param("candidatId") Long candidatId,
            @Param("formationId") Long formationId,
            @Param("parcoursId") Long parcoursId);

    @Query("""
        SELECT i FROM InscriptionFormation i
        WHERE i.candidat.id = :candidatId
        AND i.formation.id = :formationId
        AND ( (:parcoursId IS NULL AND i.parcoursId IS NULL) OR i.parcoursId = :parcoursId )
        ORDER BY i.dateInscription DESC, i.id DESC
    """)
    List<InscriptionFormation> findAllByCandidatIdAndFormationIdAndParcoursId(
            @Param("candidatId") Long candidatId,
            @Param("formationId") Long formationId,
            @Param("parcoursId") Long parcoursId);
}