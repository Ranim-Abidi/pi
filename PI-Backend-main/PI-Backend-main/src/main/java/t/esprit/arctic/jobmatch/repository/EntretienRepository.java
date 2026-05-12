package t.esprit.arctic.jobmatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import t.esprit.arctic.jobmatch.entity.Entretien;
import t.esprit.arctic.jobmatch.entity.CategorieEntretien;
import t.esprit.arctic.jobmatch.entity.Candidat;
import t.esprit.arctic.jobmatch.entity.Recruteur;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Collection;
import java.util.Optional;

@Repository
public interface EntretienRepository extends JpaRepository<Entretien, Long> {
    List<Entretien> findByCandidat(Candidat candidat);
    List<Entretien> findByCandidatId(Long candidatId);
    List<Entretien> findByRecruteur(Recruteur recruteur);
    List<Entretien> findByCategorie(CategorieEntretien categorie);
    List<Entretien> findByCandidatAndCompleted(Candidat candidat, boolean completed);
    List<Entretien> findByOffreEmploiId(Long offreId);
    List<Entretien> findByOffreEmploiIdIn(Collection<Long> offreIds);

    List<Entretien> findByCategorieAndCompleted(CategorieEntretien categorie, boolean completed);
    
    // Scheduler methods
    List<Entretien> findByDateEntretienBetweenAndCompleted(LocalDateTime start, LocalDateTime end, boolean completed);
}

