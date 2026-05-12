package t.esprit.arctic.jobmatch.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import t.esprit.arctic.jobmatch.repository.CandidatureRepository;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

@Component
public class CandidatureScheduler {

    @Autowired
    private CandidatureRepository candidatureRepository;

    @Scheduled(fixedRate = 60000)
    public void archiverAnciennesCandidatures() {
        LocalDateTime dateLimite = LocalDateTime.now().minusDays(7);
        LocalDateTime maintenant = LocalDateTime.now();

        int count = candidatureRepository
                .archiverCandidaturesPlusDe7Jours(dateLimite, maintenant);

        System.out.println("✅ Archivées : " + count);
    }}