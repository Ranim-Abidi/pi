package t.esprit.arctic.jobmatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import t.esprit.arctic.jobmatch.entity.Evenement;
import t.esprit.arctic.jobmatch.entity.Participation;
import t.esprit.arctic.jobmatch.entity.Utilisateur;
import java.time.LocalDateTime;
import java.util.List;





import java.util.List;
import java.util.Optional;

public interface ParticipationRepository extends JpaRepository<Participation, Long> {

    List<Participation> findByEvenementId(Long evenementId);

    List<Participation> findByCandidatId(Long candidatId);

    boolean existsByCandidatIdAndEvenementId(Long candidatId, Long evenementId);

    List<Participation> findByEvenementIdAndStatut(Long evenementId, String statut);

    @Query("SELECT p FROM Participation p WHERE p.evenement.organisateur.id = :organisateurId AND p.statut = 'EN_ATTENTE'")
    List<Participation> findDemandesByOrganisateur(@Param("organisateurId") Long organisateurId);

    @Query("SELECT COUNT(p) FROM Participation p " +
            "WHERE p.evenement.id = :evenementId " +
            "AND p.statut = :statut")
    int countByEvenementIdAndStatut(
            @Param("evenementId") Long evenementId,
            @Param("statut") String statut);

    int countByEvenementId(Long evenementId);

    @Query("SELECT COUNT(p) FROM Participation p " +
            "WHERE p.evenement.organisateur.id = :organisateurId " +
            "AND MONTH(p.evenement.dateHeure) = :mois " +    // ← date → dateHeure
            "AND YEAR(p.evenement.dateHeure) = :annee " +    // ← date → dateHeure
            "AND p.statut = :statut")
    int countByOrganisateurAndMoisAndStatut(
            @Param("organisateurId") Long organisateurId,
            @Param("mois") int mois,
            @Param("annee") int annee,
            @Param("statut") String statut);

    int countByCandidatIdAndStatut(Long candidatId, String statut);

    int countByCandidatId(Long candidatId);

    @Query("SELECT p.evenement.type FROM Participation p " +
            "WHERE p.candidat.id = :candidatId " +
            "GROUP BY p.evenement.type " +
            "ORDER BY COUNT(p) DESC")
    List<String> findTypeFavoriByCandidat(@Param("candidatId") Long candidatId);


    boolean existsByCandidatIdAndEvenementIdAndStatut(
            Long candidatId,
            Long evenementId,
            String statut
    );

    List<Participation> findByCandidatIdAndStatut(Long candidatId, String statut);


    @Query("""
    SELECT p FROM Participation p
    WHERE p.statut = 'CONFIRME'
    AND (p.certificateGenerated = false OR p.certificateGenerated IS NULL)
    AND p.evenement.dateHeure < :cutoff
""")
    List<Participation> findEligibleForCertificate(@Param("cutoff") LocalDateTime cutoff);
}