package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import t.esprit.arctic.jobmatch.entity.Document;
import t.esprit.arctic.jobmatch.entity.TypeDocument;
import t.esprit.arctic.jobmatch.repository.DocumentRepository;
import t.esprit.arctic.jobmatch.repository.CandidatureRepository;

import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
@RequiredArgsConstructor
public class DocumentScheduler {

    private final DocumentRepository documentRepository;
    private final CandidatureRepository candidatureRepository;

    /**
      S'exécute tous les jours à 02:00
     */
    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void nettoyerDocumentsAnciens() {
        log.info(" [SCHEDULER] Nettoyage des documents anciens - {}", LocalDateTime.now());

        LocalDateTime dateLimite = LocalDateTime.now().minusDays(30);
        List<Document> documentsAnciens = documentRepository.findByUpdatedAtBefore(dateLimite);

        int compteur = 0;
        for (Document doc : documentsAnciens) {
            log.info("Suppression: {}", doc.getNom());
            documentRepository.delete(doc);
            compteur++;
        }

        log.info(" Nettoyage terminé - {} document(s) supprimé(s)", compteur);
    }

    //Met à jour les scores des CV  S'exécute tous les jours à 03:00

    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void mettreAJourScoresATS() {
        log.info("📊 [SCHEDULER] Mise à jour scores ATS - {}", LocalDateTime.now());

        try {
            List<Document> cvDocuments = documentRepository.findByType(TypeDocument.CV);

            int compteur = 0;
            for (Document cv : cvDocuments) {
                int scoreATS = calculerScoreATS(cv.getContenu());
                cv.setScoreATS(scoreATS);
                documentRepository.save(cv);
                compteur++;
                log.info("{} - Score ATS: {}%", cv.getNom(), scoreATS);
            }

            log.info(" {} CV(s) mis à jour", compteur);

        } catch (Exception e) {
            log.error(" Erreur mise à jour scores: {}", e.getMessage());
        }
    }

    //Archivage automatique des candidatures après 7 jours S'exécute tous les jours à minuit

    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void archiverCandidaturesAuto() {
        log.info(" [SCHEDULER] Archivage auto des candidatures - {}", LocalDateTime.now());

        try {
            // Date limite = maintenant - 7 jours
            LocalDateTime dateLimite = LocalDateTime.now().minusDays(7);
            LocalDateTime dateArchive = LocalDateTime.now();

            // Archiver directement avec les 2 paramètres
            int nbArchive = candidatureRepository.archiverCandidaturesPlusDe7Jours(dateLimite, dateArchive);

            if (nbArchive > 0) {
                log.info(" {} candidature(s) archivées (plus de 7 jours)", nbArchive);
            } else {
                log.info(" Aucune candidature à archiver aujourd'hui");
            }

        } catch (Exception e) {
            log.error(" Erreur lors de l'archivage automatique: {}", e.getMessage());
        }
    }


    // Test du scheduler Pour tester, décommentez l'annotation @Scheduled

     @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void testScheduler() {
        log.info(" [TEST] Scheduler fonctionne - {}", LocalDateTime.now());
        long count = documentRepository.count();
        log.info(" Nombre total de documents: {}", count);
    }


    //  Calcule le score ATS d'un CV basé sur son contenu

    private int calculerScoreATS(String contenuHTML) {
        if (contenuHTML == null || contenuHTML.isEmpty()) {
            return 0;
        }

        String contenuTexte = contenuHTML.replaceAll("<[^>]*>", " ").toLowerCase();

        int score = 0;
        if (contenuTexte.contains("expérience") || contenuTexte.contains("experience")) score += 20;
        if (contenuTexte.contains("compétence") || contenuTexte.contains("competence")) score += 20;
        if (contenuTexte.contains("formation") || contenuTexte.contains("education")) score += 20;
        if (contenuTexte.contains("diplôme") || contenuTexte.contains("diplome")) score += 20;
        if (contenuTexte.contains("projet") || contenuTexte.contains("project")) score += 20;

        return Math.min(score, 100);
    }
}