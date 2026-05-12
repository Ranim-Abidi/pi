package t.esprit.arctic.jobmatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import t.esprit.arctic.jobmatch.entity.Partenaire;
import t.esprit.arctic.jobmatch.entity.TypePartenaire;
import java.util.List;

public interface PartenaireRepository extends JpaRepository<Partenaire, Long> {


    List<Partenaire> findByType(TypePartenaire type);

    @Query("SELECT p FROM Partenaire p LEFT JOIN p.offres o GROUP BY p ORDER BY COUNT(o) DESC")
    List<Partenaire> findTopByOffres();

    @Query("""
    SELECT p.nom,
           COUNT(o.id) AS nbOffres,
           SUM(CASE WHEN o.type = 'EMPLOI' THEN 1 ELSE 0 END) AS nbEmploi,
           SUM(CASE WHEN o.type = 'STAGE'  THEN 1 ELSE 0 END) AS nbStage
    FROM Partenaire p
    LEFT JOIN p.offres o
    GROUP BY p.id, p.nom
    ORDER BY nbOffres DESC
""")
    List<Object[]> findTopPartenaires();

    List<Partenaire> findByStatutActivite(String statutActivite);

    List<Partenaire> findByScorePopulariteGreaterThanOrderByScorePopulariteDesc(
            double score
    );


    List<Partenaire> findByTypeAndStatutActivite(
            TypePartenaire type,
            String statutActivite
    );
}