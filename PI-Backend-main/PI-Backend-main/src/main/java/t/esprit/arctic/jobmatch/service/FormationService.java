package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import t.esprit.arctic.jobmatch.entity.Formation;
import t.esprit.arctic.jobmatch.dto.FormationStatsDTO;
import t.esprit.arctic.jobmatch.repository.FormationRepository;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class FormationService {

    private final FormationRepository formationRepository;

    public List<Formation> getAll() {
        return formationRepository.findAll();
    }

    public List<Formation> getAllActives() {
        return formationRepository.findByStatutNot("Archivée");
    }

    /** Version utilisée par le moteur ML — charge les compétences en JOIN FETCH */
    public List<Formation> getAllActivesWithCompetences() {
        return formationRepository.findActivesWithCompetences();
    }

    public List<Formation> getAllForAdmin() {
        return formationRepository.findAll();
    }

    public Formation getById(Long id) {
        return formationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Formation non trouvée avec l'id : " + id));
    }

    public Formation create(Formation formation) {
        return formationRepository.save(formation);
    }

    public Formation update(Long id, Formation updated) {
        Formation existing = getById(id);
        existing.setTitre(updated.getTitre());
        existing.setCategorie(updated.getCategorie());
        existing.setPlateforme(updated.getPlateforme());
        existing.setStatut(updated.getStatut());
        existing.setDuree(updated.getDuree());
        existing.setNiveau(updated.getNiveau());
        existing.setCompetences(updated.getCompetences());
        // ✅ Mise à jour du lien externe
        existing.setLienExterne(updated.getLienExterne());
        return formationRepository.save(existing);
    }

    public void delete(Long id) {
        getById(id);
        formationRepository.deleteById(id);
    }

    public Formation archiver(Long id) {
        Formation formation = getById(id);
        formation.setStatut("Archivée");
        return formationRepository.save(formation);
    }

    public Formation desarchiver(Long id) {
        Formation formation = getById(id);
        formation.setStatut("Disponible");
        return formationRepository.save(formation);
    }

    public List<Formation> getByNiveau(String niveau) {
        return formationRepository.findByNiveau(niveau);
    }

    public List<Formation> getByCategorie(String categorie) {
        return formationRepository.findByCategorie(categorie);
    }

    public List<Formation> getArchivees() {
        return formationRepository.findByStatut("Archivée");
    }


    // JPQL global
    public List<t.esprit.arctic.jobmatch.dto.FormationStatsDTO> getFormationsAvecStatistiques() {
        List<t.esprit.arctic.jobmatch.dto.FormationStatsDTO> list = formationRepository.findAllAvecStatistiques();
        list.sort((a, b) -> Double.compare(
            b.getScorePopularite() != null ? b.getScorePopularite() : 0.0,
            a.getScorePopularite() != null ? a.getScorePopularite() : 0.0
        ));
        return list;
    }

    // JPQL par catégorie
    public List<t.esprit.arctic.jobmatch.dto.FormationStatsDTO> getStatsParCategorie(String categorie) {
        List<t.esprit.arctic.jobmatch.dto.FormationStatsDTO> list = formationRepository.findStatsParCategorie(categorie);
        list.sort((a, b) -> Double.compare(
            b.getScorePopularite() != null ? b.getScorePopularite() : 0.0,
            a.getScorePopularite() != null ? a.getScorePopularite() : 0.0
        ));
        return list;
    }

    // JPQL top 3
    public List<t.esprit.arctic.jobmatch.dto.FormationStatsDTO> getTopFormations() {
        return formationRepository.findAllDisponiblesAvecStatistiques()
            .stream()
            .sorted((a, b) -> Double.compare(
                b.getScorePopularite() != null ? b.getScorePopularite() : 0.0,
                a.getScorePopularite() != null ? a.getScorePopularite() : 0.0
            ))
            .limit(3)
            .toList();
    }

    public List<Formation> getFormationsParBadge(String badge) {
        return formationRepository.findByStatutAndBadge("Disponible", badge);
    }

    public List<Formation> getFormationsPopulaires(Double scoreMin) {
        return formationRepository
            .findByStatutAndScorePopulariteGreaterThanOrderByScorePopulariteDesc(
                "Disponible", scoreMin);
    }

    public List<Formation> getFormationsParCategorieNiveauBadge(
            String categorie, String niveau) {
        return formationRepository
            .findByStatutAndNiveauAndBadgeIsNotNull("Disponible", niveau);
    }

    @Transactional
    public Map<String, Integer> refreshScoresEtBadges() {
        List<FormationStatsDTO> stats = formationRepository.findAllAvecStatistiques();
        int miseAJour = 0;
        int archives = 0;

        for (FormationStatsDTO stat : stats) {
            String badge = calculerBadge(stat);

            formationRepository.updateScoreEtBadge(
                    stat.getFormationId(),
                    stat.getScorePopularite(),
                    badge,
                    stat.getTotalInscrits() != null ? stat.getTotalInscrits().intValue() : 0,
                    stat.getNoteMoyenne(),
                    stat.getTauxCompletion()
            );
            miseAJour++;
        }

        return Map.of(
                "miseAJour", miseAJour,
                "archives", archives,
                "total", stats.size()
        );
    }

    private String calculerBadge(FormationStatsDTO stat) {
        long inscrits = stat.getTotalInscrits() != null ? stat.getTotalInscrits() : 0L;
        double note = stat.getNoteMoyenne() != null ? stat.getNoteMoyenne() : 0.0;
        double score = stat.getScorePopularite() != null ? stat.getScorePopularite() : 0.0;

        if (note >= 4.5 && inscrits >= 3)
            return "Top noté";

        if (score >= 55.0)
            return "Tendance";

        if (inscrits >= 30)
            return "Populaire";

        if (note >= 4.0 && inscrits >= 1)
            return "Bien noté";

        return null;
    }
}