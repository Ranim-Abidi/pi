package t.esprit.arctic.jobmatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import t.esprit.arctic.jobmatch.entity.Candidature;

import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;
import java.util.Optional;

public interface CandidatureRepository extends JpaRepository<Candidature, Long> {

    List<Candidature> findByCandidatId(Long candidatId);

    List<Candidature> findByOffreEmploiId(Long offreId);

    List<Candidature> findByStatut(String statut);

    List<Candidature> findAllByOrderByDateEnvoiDesc();

    List<Candidature> findByCandidatIdAndStatut(Long candidatId, String statut);

    List<Candidature> findByStatutAndDateEnvoiBefore(String statut, Date date);

    List<Candidature> findByDateEnvoiBefore(Date date);

    List<Candidature> findByCandidatIdAndStatutAndDateEnvoiBefore(
            Long candidatId, String statut, Date date);

    List<Candidature> findByCandidatIdAndEmail(Long candidatId, String email);

    List<Candidature> findByArchiveTrue();

    List<Candidature> findByArchiveFalseOrArchiveIsNull();

    List<Candidature> findByCandidatIdAndNecessiteAttentionTrue(Long candidatId);

    List<Candidature> findByDateEnvoiBeforeAndArchiveFalse(Date date);

    // ==================== ARCHIVAGE ====================

    @Query("SELECT c FROM Candidature c WHERE c.dateEnvoi < :dateLimite AND (c.archive = false OR c.archive IS NULL)")
    List<Candidature> findCandidaturesPlusDe7Jours(@Param("dateLimite") LocalDateTime dateLimite);

    // SUPPRIMÉ : première version avec LocalDateTime pour les deux paramètres
    // Cette méthode causait le conflit

    @Modifying
    @Transactional
    @Query("UPDATE Candidature c SET c.archive = true, c.archiveDate = :dateArchive " +
            "WHERE c.dateEnvoi < :dateLimite AND (c.archive = false OR c.archive IS NULL)")
    int archiverCandidaturesPlusDe7Jours(
            @Param("dateLimite") LocalDateTime dateLimite,
            @Param("dateArchive") LocalDateTime dateArchive);

    @Modifying
    @Transactional
    @Query("UPDATE Candidature c SET c.archive = false, c.archiveDate = null WHERE c.id = :id")
    int restaurerCandidature(@Param("id") Long id);

    // ==================== JPQL ====================

    @Query("SELECT c, ca FROM Candidature c JOIN c.candidat ca WHERE ca.nom = :nom")
    List<Object[]> findCandidaturesByCandidatNom(@Param("nom") String nom);

    @Query("SELECT c, o FROM Candidature c JOIN c.offreEmploi o WHERE o.entreprise = :entreprise")
    List<Object[]> findCandidaturesByOffreEntreprise(@Param("entreprise") String entreprise);

    @Query("SELECT c, d FROM Candidature c JOIN c.document d WHERE d.type = :type")
    List<Object[]> findCandidaturesByDocumentType(@Param("type") String type);

    @Query("SELECT c, ca, o FROM Candidature c " +
            "JOIN c.candidat ca " +
            "JOIN c.offreEmploi o " +
            "WHERE c.statut = :statut")
    List<Object[]> findFullCandidaturesByStatut(@Param("statut") String statut);

    @Query("SELECT c, ca, d FROM Candidature c " +
            "JOIN c.candidat ca " +
            "LEFT JOIN c.document d")
    List<Object[]> findAllCandidaturesWithLeftJoinDocument();

    @Query("SELECT c, ca, o FROM Candidature c " +
            "JOIN c.candidat ca " +
            "JOIN c.offreEmploi o " +
            "WHERE o.entreprise = :entreprise AND c.statut = :statut")
    List<Object[]> findCandidaturesByEntrepriseAndStatut(
            @Param("entreprise") String entreprise,
            @Param("statut") String statut);

    @Query("SELECT ca.id, ca.nom, ca.prenom, COUNT(c), " +
            "SUM(CASE WHEN c.statut = 'ACCEPTEE' THEN 1 ELSE 0 END) " +
            "FROM Candidature c JOIN c.candidat ca " +
            "GROUP BY ca.id, ca.nom, ca.prenom " +
            "ORDER BY COUNT(c) DESC")
    List<Object[]> getStatsByCandidat();

    @Query("SELECT c, ca, o FROM Candidature c " +
            "JOIN c.candidat ca " +
            "JOIN c.offreEmploi o " +
            "WHERE o.salary >= :minSalary")
    List<Object[]> findCandidaturesByMinSalary(@Param("minSalary") Double minSalary);

    Optional<Object> findTopByCandidatIdAndOffreEmploiIdOrderByDateEnvoiDesc(Long candidatId, Long offreId);
}