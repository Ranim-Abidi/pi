package t.esprit.arctic.jobmatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import t.esprit.arctic.jobmatch.entity.RechercheHistorique;
import java.util.List;

public interface RechercheHistoriqueRepository
        extends JpaRepository<RechercheHistorique, Long> {

    // Récupère les N dernières recherches d'un candidat, triées du plus récent au plus ancien
    List<RechercheHistorique> findByCandidatIdOrderByDateRechercheDesc(Long candidatId);

    // Vérifie si ce terme a déjà été cherché récemment par ce candidat (évite les doublons)
    boolean existsByCandidatIdAndTerme(Long candidatId, String terme);

    // Supprime l'ancienne entrée pour ce terme (avant de la recréer fraîche)
    void deleteByCandidatIdAndTerme(Long candidatId, String terme);

}