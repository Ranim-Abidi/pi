package t.esprit.arctic.jobmatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import t.esprit.arctic.jobmatch.dto.OffreSearchDTO;
import t.esprit.arctic.jobmatch.entity.OffreEmploi;

import java.util.List;

/**
 * Repository spécialisé pour la recherche avancée d'offres d'emploi
 * Utilise des requêtes JPQL complexes avec jointures multiples
 */
@Repository
public interface OffreSearchRepository extends JpaRepository<OffreEmploi, Long> {

    /**
     * Recherche avancée dans le titre, description, compétences et entreprise
     * Jointures: recruteur, candidatures
     * 
     * @param keyword Mot-clé de recherche
     * @return Liste des offres correspondantes triées par pertinence
     */
    @Query(
        "SELECT NEW t.esprit.arctic.jobmatch.dto.OffreSearchDTO(" +
        "o.id, " +
        "COALESCE(o.titre, ''), " +
        "COALESCE(o.description, ''), " +
        "COALESCE(r.entreprise, ''), " +
        "COALESCE(r.nom, ''), " +
        "COALESCE(r.email, ''), " +
        "COALESCE(o.location, ''), " +
        "COALESCE(o.typeContrat, ''), " +
        "CAST(COALESCE(o.salary, 0) AS string), " +
        "CAST(o.datePublication AS java.sql.Timestamp), " +
        "COUNT(DISTINCT c.id), " +
        "COUNT(DISTINCT CASE WHEN c.statut = 'ACCEPTEE' THEN c.id END), " +
        "CAST(CASE " +
        "  WHEN LOWER(o.titre) LIKE LOWER(CONCAT('%', :keyword, '%')) THEN 40 " +
        "  WHEN LOWER(o.description) LIKE LOWER(CONCAT('%', :keyword, '%')) THEN 25 " +
        "  WHEN LOWER(r.entreprise) LIKE LOWER(CONCAT('%', :keyword, '%')) THEN 20 " +
        "  WHEN LOWER(o.location) LIKE LOWER(CONCAT('%', :keyword, '%')) THEN 15 " +
        "  ELSE 0 END AS double), " +
        "'', '' " +
        ") " +
        "FROM OffreEmploi o " +
        "LEFT JOIN o.recruteur r " +
        "LEFT JOIN o.candidatures c " +
        "WHERE " +
        "  LOWER(COALESCE(o.titre, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
        "  LOWER(COALESCE(o.description, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
        "  LOWER(COALESCE(r.entreprise, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
        "  LOWER(COALESCE(o.location, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
        "  LOWER(COALESCE(o.typeContrat, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
        "GROUP BY o.id, o.titre, o.description, r.entreprise, r.nom, r.email, " +
        "         o.location, o.typeContrat, o.salary, o.datePublication " +
        "ORDER BY CASE " +
        "  WHEN LOWER(o.titre) LIKE LOWER(CONCAT('%', :keyword, '%')) THEN 40 " +
        "  WHEN LOWER(o.description) LIKE LOWER(CONCAT('%', :keyword, '%')) THEN 25 " +
        "  WHEN LOWER(r.entreprise) LIKE LOWER(CONCAT('%', :keyword, '%')) THEN 20 " +
        "  WHEN LOWER(o.location) LIKE LOWER(CONCAT('%', :keyword, '%')) THEN 15 " +
        "  ELSE 0 END DESC, o.datePublication DESC"
    )
    List<OffreSearchDTO> searchByKeyword(@Param("keyword") String keyword);

    /**
     * Recherche avec critères multiples (mots-clés, location, salaire, type de contrat)
     * 
     * @param keyword Mot-clé de recherche
     * @param location Localisation souhaitée
     * @param minSalaire Salaire minimum
     * @param maxSalaire Salaire maximum
     * @param typeContrat Type de contrat (CDI, CDD, Stage, Freelance)
     * @return Offres correspondant aux critères
     */
    @Query(
        "SELECT NEW t.esprit.arctic.jobmatch.dto.OffreSearchDTO(" +
        "o.id, o.titre, o.description, r.entreprise, r.nom, r.email, " +
        "o.location, o.typeContrat, CAST(o.salary AS string), o.datePublication, " +
        "COUNT(DISTINCT c.id), " +
        "COUNT(DISTINCT CASE WHEN c.statut = 'ACCEPTEE' THEN c.id END), " +
        "0.0, '', '' " +
        ") " +
        "FROM OffreEmploi o " +
        "INNER JOIN o.recruteur r " +
        "LEFT JOIN o.candidatures c " +
        "WHERE " +
        "  (:keyword IS NULL OR " +
        "   LOWER(o.titre) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
        "   LOWER(o.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
        "   LOWER(r.entreprise) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
        "  (:location IS NULL OR LOWER(o.location) = LOWER(:location)) AND " +
        "  (:minSalaire IS NULL OR CAST(o.salary AS int) >= :minSalaire) AND " +
        "  (:maxSalaire IS NULL OR CAST(o.salary AS int) <= :maxSalaire) AND " +
        "  (:typeContrat IS NULL OR LOWER(o.typeContrat) = LOWER(:typeContrat)) " +
        "GROUP BY o.id, o.titre, o.description, r.entreprise, r.nom, r.email, " +
        "         o.location, o.typeContrat, o.salary, o.datePublication " +
        "ORDER BY o.datePublication DESC"
    )
    List<OffreSearchDTO> searchWithFilters(
        @Param("keyword") String keyword,
        @Param("location") String location,
        @Param("minSalaire") Integer minSalaire,
        @Param("maxSalaire") Integer maxSalaire,
        @Param("typeContrat") String typeContrat
    );

    /**
     * Recherche par entreprise avec mots-clés dans les offres
     * Inclut les statistiques de candidatures
     * 
     * @param nomEntreprise Nom de l'entreprise
     * @param keyword Mot-clé optionnel
     * @return Offres de l'entreprise avec statistiques
     */
    @Query(
        "SELECT NEW t.esprit.arctic.jobmatch.dto.OffreSearchDTO(" +
        "o.id, o.titre, o.description, r.entreprise, r.nom, r.email, " +
        "o.location, o.typeContrat, CAST(o.salary AS string), o.datePublication, " +
        "COUNT(DISTINCT c.id), " +
        "COUNT(DISTINCT CASE WHEN c.statut = 'ACCEPTEE' THEN c.id END), " +
        "CAST(COUNT(DISTINCT c.id) AS double), '', '' " +
        ") " +
        "FROM OffreEmploi o " +
        "INNER JOIN o.recruteur r " +
        "LEFT JOIN o.candidatures c " +
        "WHERE LOWER(r.entreprise) = LOWER(:nomEntreprise) AND " +
        "      (:keyword IS NULL OR LOWER(o.titre) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
        "GROUP BY o.id, o.titre, o.description, r.entreprise, r.nom, r.email, " +
        "         o.location, o.typeContrat, o.salary, o.datePublication " +
        "ORDER BY o.datePublication DESC"
    )
    List<OffreSearchDTO> searchByCompanyName(
        @Param("nomEntreprise") String nomEntreprise,
        @Param("keyword") String keyword
    );

    /**
     * Recherche les offres les plus populaires par nombre de candidatures
     * Filtrées par mots-clés optionnels
     * 
     * @param keyword Mot-clé optionnel
     * @param limit Nombre de résultats maximum
     * @return Top offres les plus attractives
     */
    @Query(
        "SELECT NEW t.esprit.arctic.jobmatch.dto.OffreSearchDTO(" +
        "o.id, o.titre, o.description, r.entreprise, r.nom, r.email, " +
        "o.location, o.typeContrat, CAST(o.salary AS string), o.datePublication, " +
        "COUNT(DISTINCT c.id), " +
        "COUNT(DISTINCT CASE WHEN c.statut = 'ACCEPTEE' THEN c.id END), " +
        "CAST(COUNT(DISTINCT c.id) AS double), '', '' " +
        ") " +
        "FROM OffreEmploi o " +
        "INNER JOIN o.recruteur r " +
        "LEFT JOIN o.candidatures c " +
        "WHERE :keyword IS NULL OR " +
        "      LOWER(o.titre) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
        "      LOWER(o.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
        "      LOWER(r.entreprise) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
        "GROUP BY o.id, o.titre, o.description, r.entreprise, r.nom, r.email, " +
        "         o.location, o.typeContrat, o.salary, o.datePublication " +
        "HAVING COUNT(DISTINCT c.id) > 0 " +
        "ORDER BY COUNT(DISTINCT c.id) DESC"
    )
    List<OffreSearchDTO> findPopularOffres(
        @Param("keyword") String keyword
    );
}
