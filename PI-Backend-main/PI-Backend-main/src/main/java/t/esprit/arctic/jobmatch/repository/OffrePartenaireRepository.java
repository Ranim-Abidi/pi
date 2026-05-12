package t.esprit.arctic.jobmatch.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

import t.esprit.arctic.jobmatch.entity.OffrePartenaire;
import t.esprit.arctic.jobmatch.entity.TypeOffrePartenaire;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import t.esprit.arctic.jobmatch.entity.TypePartenaire;

public interface OffrePartenaireRepository extends JpaRepository<OffrePartenaire, Long>  {
    List<OffrePartenaire> findByPartenaireId(Long partenaireId);
    List<OffrePartenaire> findByType(TypeOffrePartenaire type);
    @Query("SELECT o FROM OffrePartenaire o WHERE " +
            "LOWER(o.titre) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(o.description) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<OffrePartenaire> searchByKeyword(@Param("keyword") String keyword);

    List<OffrePartenaire> findByPartenaireTypeAndType(
            TypePartenaire typePartenaire,
            TypeOffrePartenaire typeOffre
    );


    List<OffrePartenaire> findByEpingleeTrueAndPartenaireStatutActivite(
            String statutActivite
    );


    long countByPartenaireTypeAndType(
            TypePartenaire typePartenaire,
            TypeOffrePartenaire typeOffre
    );


    @Query("SELECT o FROM OffrePartenaire o " +
            "WHERE o.datePublication IS NOT NULL " +
            "ORDER BY o.datePublication DESC")
    List<OffrePartenaire> findDernieresOffres();

}
