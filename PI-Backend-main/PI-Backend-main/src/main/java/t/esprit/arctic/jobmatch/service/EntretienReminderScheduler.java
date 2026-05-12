package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import t.esprit.arctic.jobmatch.entity.Entretien;
import t.esprit.arctic.jobmatch.entity.Notification;
import t.esprit.arctic.jobmatch.repository.EntretienRepository;
import t.esprit.arctic.jobmatch.repository.NotificationRepository;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EntretienReminderScheduler {

    private final EntretienRepository entretienRepository;
    private final NotificationService notificationService;
    private final NotificationRepository notificationRepository;

    /**
     * Send interview reminders every 5 minutes.
     * Checks for interviews in the next hour window and creates reminder notifications.
     */
    @Scheduled(cron = "1 * * * * *")
    @Transactional
    public void sendInterviewReminders() {
        try {
            log.info("🔔 Starting interview reminder scheduler...");
            
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime inOneHourStart = now.plusHours(1).minusMinutes(2);
            LocalDateTime inOneHourEnd = now.plusHours(1).plusMinutes(2);

            // Find interviews scheduled for the next hour
            List<Entretien> upcomingEntretiens = entretienRepository
                    .findByDateEntretienBetweenAndCompleted(inOneHourStart, inOneHourEnd, false);

            log.info("Found {} upcoming interviews to remind", upcomingEntretiens.size());

            for (Entretien entretien : upcomingEntretiens) {
                try {
                    // Check if reminder was already sent (idempotence)
                    boolean reminderExists = notificationRepository.existsByEntretienIdAndTypeAndIsReadFalse(
                            entretien.getId(), "interview_reminder"
                    );

                    if (!reminderExists) {
                        // Send reminder to candidate
                        if (entretien.getCandidat() != null) {
                            createInterviewReminderNotification(
                                    entretien.getCandidat().getId(),
                                    entretien
                            );
                        }

                        // Send reminder to recruiter
                        if (entretien.getRecruteur() != null) {
                            createInterviewReminderNotification(
                                    entretien.getRecruteur().getId(),
                                    entretien
                            );
                        }

                        log.info("✅ Interview reminder sent for entretien ID: {}", entretien.getId());
                    }
                } catch (Exception e) {
                    log.error("❌ Error sending reminder for entretien ID {}: {}", entretien.getId(), e.getMessage(), e);
                }
            }

            log.info("🔔 Interview reminder scheduler completed");
        } catch (Exception e) {
            log.error("❌ Error in interview reminder scheduler: {}", e.getMessage(), e);
        }
    }

    /**
     * Create interview reminder notification with idempotence check
     */
    private void createInterviewReminderNotification(Long userId, Entretien entretien) {
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setSenderId(entretien.getRecruteur().getId()); // Recruiter as sender
        notification.setType("interview_reminder");
        notification.setEntretienId(entretien.getId());
        notification.setMessage("Reminder: Your interview '" + entretien.getTitre() + 
                                "' is scheduled in approximately 1 hour at " + 
                                entretien.getDateEntretien().format(
                                    java.time.format.DateTimeFormatter.ofPattern("HH:mm")
                                ));
        notification.setIsRead(false);

        // Save to database
        Notification savedNotification = notificationRepository.save(notification);
        log.debug("Interview reminder notification created: ID={}, UserID={}", 
                  savedNotification.getId(), userId);
    }
}
