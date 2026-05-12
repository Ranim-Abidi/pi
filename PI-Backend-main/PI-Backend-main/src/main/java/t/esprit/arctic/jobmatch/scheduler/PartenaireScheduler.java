package t.esprit.arctic.jobmatch.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import t.esprit.arctic.jobmatch.entity.Partenaire;
import t.esprit.arctic.jobmatch.repository.PartenaireRepository;
import t.esprit.arctic.jobmatch.service.DashboardService;
import t.esprit.arctic.jobmatch.service.WebSocketService;

import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class PartenaireScheduler {

    private final PartenaireRepository partenaireRepo;
    private final WebSocketService     webSocketService;
    private final DashboardService     dashboardService;


    @Scheduled(fixedRate = 30000)
    @Transactional
    public void calculerScoresEtPusher() {
        log.info("Scheduler : calcul scores popularité");

        List<Partenaire> partenaires = partenaireRepo.findAll();

        for (Partenaire p : partenaires) {
            int nbOffres = p.getOffres() != null ? p.getOffres().size() : 0;
            int nbVues   = p.getNombreVues();


            double anciennete = 1.0;
            if (p.getOffres() != null && !p.getOffres().isEmpty()) {
                Date premiere = p.getOffres().stream()
                        .map(o -> o.getDatePublication())
                        .filter(d -> d != null)
                        .min(Comparator.naturalOrder()).orElse(null);
                if (premiere != null) {
                    long diffMs = new Date().getTime() - premiere.getTime();
                    anciennete  = Math.max(1, diffMs / (1000.0 * 60 * 60 * 24 * 7));
                }
            }

            double activityRate = nbOffres / anciennete;


            double scoreOffres   = Math.min(nbOffres * 5, 40);
            double scoreVues     = Math.min(nbVues   * 0.5, 30);
            double scoreActivite = Math.min(activityRate * 10, 30);
            double score = Math.round((scoreOffres + scoreVues + scoreActivite) * 10.0) / 10.0;


            String statut;
            if      (activityRate >= 2) statut = "TRES_ACTIF";
            else if (activityRate >= 1) statut = "ACTIF";
            else if (nbOffres == 0)     statut = "INACTIF";
            else                        statut = "PEU_ACTIF";


            p.setScorePopularite(score);
            p.setStatutActivite(statut);
            partenaireRepo.save(p);
        }


        Map<String, Object> update = new LinkedHashMap<>();
        update.put("topPartenaires", dashboardService.getTopPartenaires());

        update.put("scores", dashboardService.getScoresPopularite());
        webSocketService.sendDashboardUpdate(update);

        log.info(" Scheduler terminé + WebSocket push envoyé");
    }
}