package t.esprit.arctic.jobmatch.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import t.esprit.arctic.jobmatch.entity.Participation;
import t.esprit.arctic.jobmatch.repository.ParticipationRepository;
import t.esprit.arctic.jobmatch.service.AttestationService;


import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class AttestationScheduler {

    private final ParticipationRepository participationRepository;
    private final AttestationService attestationService;

    // Tourne toutes les heures, à chaque heure ronde
    @Scheduled(fixedDelay = 10000)
    public void genererCertificats() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(24);
        log.info("Scheduler certificats démarré — cutoff : {}", cutoff);

        List<Participation> eligibles =
                participationRepository.findEligibleForCertificate(cutoff);

        log.info("{} participant(s) éligible(s) trouvé(s)", eligibles.size());

        for (Participation p : eligibles) {
            try {
                String url = attestationService.generateCertificat(p);
                p.setCertificateUrl(url);
                p.setCertificateGenerated(true);
                participationRepository.save(p);
                log.info("Certificat généré pour participation id={} : {}", p.getId(), url);
            } catch (Exception e) {
                log.error("Échec génération certificat pour participation id={}", p.getId(), e);
            }
        }
    }
}