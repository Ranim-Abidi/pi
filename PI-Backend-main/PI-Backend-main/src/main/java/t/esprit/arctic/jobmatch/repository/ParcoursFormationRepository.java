package t.esprit.arctic.jobmatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import t.esprit.arctic.jobmatch.entity.ParcoursFormation;

import java.util.List;

public interface ParcoursFormationRepository extends JpaRepository<ParcoursFormation, Long> {
    List<ParcoursFormation> findByCategorie(String categorie);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("""
        UPDATE ParcoursFormation p
        SET p.totalInscrits = (SELECT COUNT(ip) FROM InscriptionParcours ip WHERE ip.parcours.id = p.id),
            p.scorePopularite = (
                COALESCE((SELECT f.scorePopularite FROM Formation f WHERE f.id = p.niveauDebutant.id), 0.0) +
                COALESCE((SELECT f.scorePopularite FROM Formation f WHERE f.id = p.niveauIntermediaire.id), 0.0) +
                COALESCE((SELECT f.scorePopularite FROM Formation f WHERE f.id = p.niveauAvance.id), 0.0) +
                COALESCE((SELECT f.scorePopularite FROM Formation f WHERE f.id = p.niveauExpert.id), 0.0)
            ) / 4.0
    """)
    void refreshAllGlobalStats();
}
