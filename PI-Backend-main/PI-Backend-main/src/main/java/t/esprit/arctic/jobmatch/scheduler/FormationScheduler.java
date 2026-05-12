package t.esprit.arctic.jobmatch.scheduler;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import t.esprit.arctic.jobmatch.repository.FormationRepository;
import t.esprit.arctic.jobmatch.service.FormationService;
import t.esprit.arctic.jobmatch.service.ParcoursFormationService;

@Component
@RequiredArgsConstructor
public class FormationScheduler {

    private final FormationService formationService;
    private final ParcoursFormationService parcoursService;
    private final FormationRepository formationRepo;

    @Scheduled(cron = "1 * * * * *")
    public void calculerScoresEtBadges() {
        System.out.println("╔══════════════════════════════════════╗");
        System.out.println("║  Scheduler formations — démarrage   ║");
        System.out.println("╚══════════════════════════════════════╝");

        var result = formationService.refreshScoresEtBadges();
        parcoursService.refreshGlobalStats();

        System.out.println("══ Résumé ══════════════════════════════");
        System.out.println("  Formations mises à jour : " + result.get("miseAJour"));
        System.out.println("  Total traité            : " + result.get("total"));
        System.out.println("  Parcours mis à jour     : OK");
        System.out.println("════════════════════════════════════════");
    }

    @Scheduled(cron = "0 0 8 * * MON")
    public void relancerFormationsSansBadge() {
        var avecBadge = formationRepo.findByStatutAndBadgeIsNotNull("Disponible");
        System.out.println("Formations avec badge actif : " + avecBadge.size());

        long nbTopNotes   = formationRepo.countByStatutAndBadge("Disponible", "Top noté");
        long nbTendance   = formationRepo.countByStatutAndBadge("Disponible", "Tendance");
        long nbPopulaires = formationRepo.countByStatutAndBadge("Disponible", "Populaire");
        long nbBienNotes  = formationRepo.countByStatutAndBadge("Disponible", "Bien noté");

        System.out.println("  Top noté    : " + nbTopNotes);
        System.out.println("  Tendance    : " + nbTendance);
        System.out.println("  Populaires  : " + nbPopulaires);
        System.out.println("  Bien noté   : " + nbBienNotes);
    }
}