package t.esprit.arctic.jobmatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import t.esprit.arctic.jobmatch.dto.OffreStatistiquesDTO;
import t.esprit.arctic.jobmatch.entity.OffreEmploi;
import java.util.Date;
import java.util.List;

public interface OffreEmploiRepository extends JpaRepository<OffreEmploi, Long> {
    // You can add custom query methods here if needed
    List<OffreEmploi> findByTitreContainingIgnoreCase(String titre);
    List<OffreEmploi> findByStatut(String statut);
    List<OffreEmploi> findByRecruteurIdOrderByDatePublicationDesc(Long recruteurId);
    List<OffreEmploi> findByRecruteurEmailIgnoreCaseOrderByDatePublicationDesc(String email);
    List<OffreEmploi> findByEntrepriseIgnoreCaseOrderByDatePublicationDesc(String entreprise);


    @Query("SELECT NEW t.esprit.arctic.jobmatch.dto.OffreStatistiquesDTO(" +
           "o.id, " +
           "o.titre, " +
           "o.entreprise, " +
           "r.nom, " +
           "r.email, " +
           "COUNT(c.id), " +
           "SUM(CASE WHEN c.statut = 'ACCEPTEE' THEN 1 ELSE 0 END), " +
           "CAST(MAX(c.dateEnvoi) AS string), " +
           "o.salary, " +
           "o.typeContrat) " +
           "FROM OffreEmploi o " +
           "LEFT JOIN o.recruteur r " +
           "LEFT JOIN o.candidatures c " +
           "WHERE o.statut = 'ACTIVE' " +
           "GROUP BY o.id, o.titre, o.entreprise, r.nom, r.email, o.salary, o.typeContrat " +
           "ORDER BY COUNT(c.id) DESC")
    List<OffreStatistiquesDTO> findOffresAvecStatistiques();


    @Query("SELECT NEW t.esprit.arctic.jobmatch.dto.OffreStatistiquesDTO(" +
           "o.id, o.titre, o.entreprise, r.nom, r.email, " +
           "COUNT(c.id), " +
           "SUM(CASE WHEN c.statut = 'ACCEPTEE' THEN 1 ELSE 0 END), " +
           "CAST(MAX(c.dateEnvoi) AS string), " +
           "o.salary, o.typeContrat) " +
           "FROM OffreEmploi o " +
           "LEFT JOIN o.recruteur r " +
           "LEFT JOIN o.candidatures c " +
           "WHERE r.id = :recruteurId AND o.statut = 'ACTIVE' " +
           "GROUP BY o.id, o.titre, o.entreprise, r.nom, r.email, o.salary, o.typeContrat " +
           "ORDER BY o.datePublication DESC")
    List<OffreStatistiquesDTO> findOffresParRecruteurAvecStats(@Param("recruteurId") Long recruteurId);


    @Query("SELECT NEW t.esprit.arctic.jobmatch.dto.OffreStatistiquesDTO(" +
           "o.id, o.titre, o.entreprise, r.nom, r.email, " +
           "COUNT(c.id), " +
           "SUM(CASE WHEN c.statut = 'ACCEPTEE' THEN 1 ELSE 0 END), " +
           "CAST(MAX(c.dateEnvoi) AS string), " +
           "o.salary, o.typeContrat) " +
           "FROM OffreEmploi o " +
           "INNER JOIN o.recruteur r " +
           "LEFT JOIN o.candidatures c " +
           "WHERE o.statut = 'ACTIVE' " +
           "AND (CAST(o.salary AS int) BETWEEN :salaryMin AND :salaryMax) " +
           "GROUP BY o.id, o.titre, o.entreprise, r.nom, r.email, o.salary, o.typeContrat " +
           "HAVING COUNT(c.id) > :minCandidatures " +
           "ORDER BY COUNT(c.id) DESC")
    List<OffreStatistiquesDTO> findOffresBySalaryRangeWithCandidatures(
            @Param("salaryMin") int salaryMin,
            @Param("salaryMax") int salaryMax,
            @Param("minCandidatures") long minCandidatures);
}