package t.esprit.arctic.jobmatch.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import t.esprit.arctic.jobmatch.entity.Evenement;
import t.esprit.arctic.jobmatch.repository.EvenementRepository;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ChatScheduler {

    private final EvenementRepository evenementRepository;


    @Scheduled(fixedRate = 60000)
    public void gererChats() {
        LocalDateTime maintenant = LocalDateTime.now();
        List<Evenement> evenements = evenementRepository.findAll();

        for (Evenement e : evenements) {
            if (e.getDateHeure() == null) continue;

            LocalDateTime debut = e.getDateHeure();
            LocalDateTime ouvertureChat = debut.minusHours(24);
            LocalDateTime fermetureChat = debut.plusHours(3);


            boolean doitEtreOuvert = maintenant.isAfter(ouvertureChat)
                    && maintenant.isBefore(fermetureChat);

            if (doitEtreOuvert && !e.isChatOuvert()) {
                e.setChatOuvert(true);
                evenementRepository.save(e);
                log.info("Chat ouvert pour l'événement : {}", e.getTitre());
            } else if (!doitEtreOuvert && e.isChatOuvert()) {
                e.setChatOuvert(false);
                evenementRepository.save(e);
                log.info("Chat fermé pour l'événement : {}", e.getTitre());
            }
        }
    }
}