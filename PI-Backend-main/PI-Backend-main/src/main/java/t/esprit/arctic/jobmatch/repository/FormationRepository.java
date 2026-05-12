package t.esprit.arctic.jobmatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import t.esprit.arctic.jobmatch.dto.FormationStatsDTO;
import t.esprit.arctic.jobmatch.entity.Formation;

import java.util.List;

public interface FormationRepository extends JpaRepository<Formation, Long> {

    List<Formation> findByNiveau(String niveau);

    List<Formation> findByCategorie(String categorie);

    List<Formation> findByStatut(String statut);

    List<Formation> findByStatutNot(String statut);

    // Pour le moteur ML : charge les compétences en une seule requête (évite le LazyInit)
    @Query("SELECT DISTINCT f FROM Formation f LEFT JOIN FETCH f.competences WHERE f.statut != 'Archiv\u00e9e'")
    List<Formation> findActivesWithCompetences();

    // ══════════════════════════════════════════════════════════════
    // JPQL — jointure sur 4 tables
    // Formation + InscriptionFormation + Feedback + Certificat
    // ══════════════════════════════════════════════════════════════
    @Query("""
            SELECT new t.esprit.arctic.jobmatch.dto.FormationStatsDTO(
                f.id,
                f.titre,
                f.categorie,
                f.niveau,
                f.statut,
                f.badge,
                COUNT(DISTINCT i.id),
                AVG(DISTINCT fb.note),
                COUNT(DISTINCT c.id),
                (SELECT COUNT(DISTINCT i2.id)
                 FROM InscriptionFormation i2
                 WHERE i2.formation.id = f.id
                 AND   i2.statut = 'Terminé')
            )
            FROM Formation f
            LEFT JOIN InscriptionFormation i  ON i.formation.id = f.id
            LEFT JOIN Feedback             fb ON fb.formation.id = f.id
            LEFT JOIN Certificat           c  ON c.inscription.formation.id = f.id
            WHERE f.statut != 'Archivée'
            GROUP BY f.id, f.titre, f.categorie,
                     f.niveau, f.statut, f.badge
            """)
    List<FormationStatsDTO> findAllAvecStatistiques();

    // JPQL filtré par catégorie
    @Query("""
            SELECT new t.esprit.arctic.jobmatch.dto.FormationStatsDTO(
                f.id, f.titre, f.categorie, f.niveau, f.statut, f.badge,
                COUNT(DISTINCT i.id),
                AVG(DISTINCT fb.note),
                COUNT(DISTINCT c.id),
                (SELECT COUNT(DISTINCT i2.id)
                 FROM InscriptionFormation i2
                 WHERE i2.formation.id = f.id
                 AND   i2.statut = 'Terminé')
            )
            FROM Formation f
            LEFT JOIN InscriptionFormation i  ON i.formation.id = f.id
            LEFT JOIN Feedback             fb ON fb.formation.id = f.id
            LEFT JOIN Certificat           c  ON c.inscription.formation.id = f.id
            WHERE f.categorie = :categorie
            AND   f.statut   != 'Archivée'
            GROUP BY f.id, f.titre, f.categorie,
                     f.niveau, f.statut, f.badge
            """)
    List<FormationStatsDTO> findStatsParCategorie(
            @Param("categorie") String categorie);

    // JPQL — top N formations par score
    @Query("""
            SELECT new t.esprit.arctic.jobmatch.dto.FormationStatsDTO(
                f.id, f.titre, f.categorie, f.niveau, f.statut, f.badge,
                COUNT(DISTINCT i.id),
                AVG(DISTINCT fb.note),
                COUNT(DISTINCT c.id),
                (SELECT COUNT(DISTINCT i2.id)
                 FROM InscriptionFormation i2
                 WHERE i2.formation.id = f.id
                 AND   i2.statut = 'Terminé')
            )
            FROM Formation f
            LEFT JOIN InscriptionFormation i  ON i.formation.id = f.id
            LEFT JOIN Feedback             fb ON fb.formation.id = f.id
            LEFT JOIN Certificat           c  ON c.inscription.formation.id = f.id
            WHERE f.statut = 'Disponible'
            GROUP BY f.id, f.titre, f.categorie,
                     f.niveau, f.statut, f.badge
            """)
    List<FormationStatsDTO> findAllDisponiblesAvecStatistiques();

    @Modifying
    @Query("""
            UPDATE Formation f
            SET f.scorePopularite = :score,
                f.badge           = :badge,
                f.totalInscrits   = :totalInscrits,
                f.noteMoyenne     = :noteMoyenne,
                f.tauxCompletion  = :tauxCompletion
            WHERE f.id = :formationId
            """)
    void updateScoreEtBadge(
            @Param("formationId") Long formationId,
            @Param("score") Double score,
            @Param("badge") String badge,
            @Param("totalInscrits") Integer totalInscrits,
            @Param("noteMoyenne") Double noteMoyenne,
            @Param("tauxCompletion") Double tauxCompletion);

    // ══════════════════════════════════════════════════════════════
    // KEYWORDS QUERIES — multi-tables (via navigation JPA)
    // ══════════════════════════════════════════════════════════════

    List<Formation> findByStatutAndBadge(
            String statut, String badge);

    List<Formation> findByStatutAndCategorieAndBadge(
            String statut, String categorie, String badge);

    List<Formation> findByStatutAndNiveauAndBadgeIsNotNull(
            String statut, String niveau);

    List<Formation> findByStatutAndScorePopulariteGreaterThanOrderByScorePopulariteDesc(
            String statut, Double scoreMin);

    long countByStatutAndBadge(String statut, String badge);

    List<Formation> findByStatutAndBadgeIsNotNull(String statut);
}