package t.esprit.arctic.jobmatch.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.pusher.rest.Pusher;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import t.esprit.arctic.jobmatch.entity.Candidat;
import t.esprit.arctic.jobmatch.entity.Notification;
import t.esprit.arctic.jobmatch.entity.Utilisateur;
import t.esprit.arctic.jobmatch.repository.CandidatRepository;
import t.esprit.arctic.jobmatch.repository.NotificationRepository;
import t.esprit.arctic.jobmatch.repository.UtilisateurRepository;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final CandidatRepository candidatRepository;
    private final ObjectProvider<Pusher> pusherProvider;

    /** Freelance — notification persistée + Pusher */
    public void createNotification(Long userId, Long senderId, String type, String message) {
        createNotification(userId, senderId, null, type, message);
    }

    /** Variante avec id contextuel (stocké dans {@code offreEmploiId} si besoin). */
    public void createNotification(Long userId, Long senderId, Long relatedEntityId, String type, String message) {
        if (userId == null) {
            return;
        }
        try {
            Notification notification = new Notification();
            notification.setUserId(userId);
            notification.setSenderId(senderId);
            notification.setType(type != null ? type : "system");
            notification.setMessage(message != null ? message : "");
            notification.setIsRead(false);
            if (relatedEntityId != null) {
                notification.setOffreEmploiId(relatedEntityId);
            }
            Notification saved = notificationRepository.save(notification);
            sendPusherNotification(userId, saved);
        } catch (Exception e) {
            System.err.println("createNotification failed: " + e.getMessage());
        }
    }

    /**
     * Send profile incomplete notification via Pusher (same pattern as follow - with DB persistence)
     */
    public void sendProfileIncompleteNotification(Long userId, String missingFields) {
        try {
            Notification notification = new Notification();
            notification.setUserId(userId);
            notification.setSenderId(null);
            notification.setType("PROFILE_INCOMPLETE");
            notification.setMessage("Your profile is incomplete. Missing: " + missingFields);
            notification.setIsRead(false);
            
            Notification savedNotification = notificationRepository.save(notification);

            sendPusherNotification(userId, savedNotification);
            
        } catch (Exception e) {
            System.err.println("Error sending profile incomplete notification: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Create a follow notification and send via Pusher
     */
    public Notification createFollowNotification(Long userId, Long senderId) {
        // Get sender details for message
        Utilisateur sender = utilisateurRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Sender not found"));

        // Create notification
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setSenderId(senderId);
        notification.setType("follow");
        notification.setMessage(sender.getNom() + " started following you");
        notification.setIsRead(false);

        // Save to database
        Notification savedNotification = notificationRepository.save(notification);

        // Send real-time notification via Pusher
        sendPusherNotification(userId, savedNotification);

        return savedNotification;
    }

    /**
     * Send notification via Pusher Channels
     */
    private void sendPusherNotification(Long userId, Notification notification) {
        Pusher pusher = pusherProvider.getIfAvailable();
        if (pusher == null) {
            return;
        }
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("id", notification.getId());
            data.put("type", notification.getType());
            data.put("message", notification.getMessage());
            data.put("senderId", notification.getSenderId());
            data.put("offreEmploiId", notification.getOffreEmploiId());
            data.put("createdAt", notification.getCreatedAt().toString());

            // Send to private channel for specific user
            String channelName = "private-user-" + userId;
            pusher.trigger(channelName, "new-notification", data);

            System.out.println("✅ Pusher notification sent to " + channelName);
        } catch (Exception e) {
            System.err.println("❌ Error sending Pusher notification: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Get all notifications for a user
     */
    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Get unread notifications for a user
     */
    public List<Notification> getUnreadNotifications(Long userId) {
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }

    /**
     * Get count of unread notifications
     */
    public long getUnreadNotificationCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    /**
     * Notify all followers when a candidate enrolls in a formation
     */
    public void notifyFollowersOfFormationEnrollment(Long candidatId, String candidatName, String formationName) {
        try {
            Utilisateur candidat = utilisateurRepository.findById(candidatId)
                    .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));
            
            String followersString = candidat.getFollowers();
            if (followersString == null || followersString.isEmpty()) {
                return;
            }
            
            String[] followerIds = followersString.split(",");
            
            for (String followerId : followerIds) {
                try {
                    Long followerIdLong = Long.parseLong(followerId.trim());
                    
                    Notification notification = new Notification();
                    notification.setUserId(followerIdLong);
                    notification.setSenderId(candidatId);
                    notification.setType("formation_enrollment");
                    notification.setMessage(candidatName + " joined the formation: " + formationName);
                    notification.setIsRead(false);
                    
                    Notification savedNotification = notificationRepository.save(notification);
                    sendPusherNotification(followerIdLong, savedNotification);
                    
                } catch (NumberFormatException e) {
                    System.err.println("Error parsing follower ID: " + followerId);
                }
            }
        } catch (Exception e) {
            System.err.println("Error notifying followers of formation enrollment: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Notify all followers when a candidate participates in an event
     */
    public void notifyFollowersOfEventParticipation(Long candidatId, String candidatName, String eventName) {
        try {
            Utilisateur candidat = utilisateurRepository.findById(candidatId)
                    .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));
            
            String followersString = candidat.getFollowers();
            if (followersString == null || followersString.isEmpty()) {
                return;
            }
            
            String[] followerIds = followersString.split(",");
            
            for (String followerId : followerIds) {
                try {
                    Long followerIdLong = Long.parseLong(followerId.trim());
                    
                    Notification notification = new Notification();
                    notification.setUserId(followerIdLong);
                    notification.setSenderId(candidatId);
                    notification.setType("event_participation");
                    notification.setMessage(candidatName + " is participating in: " + eventName);
                    notification.setIsRead(false);
                    
                    Notification savedNotification = notificationRepository.save(notification);
                    sendPusherNotification(followerIdLong, savedNotification);
                    
                } catch (NumberFormatException e) {
                    System.err.println("Error parsing follower ID: " + followerId);
                }
            }
        } catch (Exception e) {
            System.err.println("Error notifying followers of event participation: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Notify all candidates when a new recruiter joins
     */
    public void notifyAllCandidatesOfNewRecruiter(Long recruiterId, String recruiterName, String company) {
        try {
            // Get all candidates
            List<Utilisateur> allCandidates = candidatRepository.findAll()
                    .stream()
                    .map(candidat -> (Utilisateur) candidat)
                    .toList();
            
            if (allCandidates.isEmpty()) {
                return;
            }
            
            String message = recruiterName + " from " + (company != null ? company : "a company") + " joined - follow to see their job offers!";
            
            for (Utilisateur candidate : allCandidates) {
                try {
                    Notification notification = new Notification();
                    notification.setUserId(candidate.getId());
                    notification.setSenderId(recruiterId);
                    notification.setType("new_recruiter");
                    notification.setMessage(message);
                    notification.setIsRead(false);
                    
                    Notification savedNotification = notificationRepository.save(notification);
                    sendPusherNotification(candidate.getId(), savedNotification);
                    
                } catch (Exception e) {
                    System.err.println("Error notifying candidate " + candidate.getId() + ": " + e.getMessage());
                }
            }
        } catch (Exception e) {
            System.err.println("Error notifying candidates of new recruiter: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Mark notification as read
     */
    public Notification markAsRead(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.setIsRead(true);
        return notificationRepository.save(notification);
    }

    /**
     * Mark all notifications as read for a user
     */
    public void markAllAsRead(Long userId) {
        List<Notification> unreadNotifications = getUnreadNotifications(userId);
        unreadNotifications.forEach(n -> {
            n.setIsRead(true);
            notificationRepository.save(n);
        });
    }

    /**
     * Delete all notifications for a user
     */
    public void deleteAllNotifications(Long userId) {
        List<Notification> allNotifications = getUserNotifications(userId);
        notificationRepository.deleteAll(allNotifications);
        System.out.println("✅ All notifications deleted for user: " + userId);
    }

    /**
     * Create job posted notifications and send via Pusher to all followers
     */
    public void notifyFollowersOfNewJob(Long recruiterUserId, String recruiterName, String jobTitle) {
        // Get recruiter with followers info
        Utilisateur recruiter = utilisateurRepository.findById(recruiterUserId)
                .orElseThrow(() -> new RuntimeException("Recruiter not found"));
        
        String followersString = recruiter.getFollowers();
        if (followersString == null || followersString.isEmpty()) {
            System.out.println("✅ No followers to notify for recruiter: " + recruiterName);
            return;
        }
        
        // Parse follower IDs
        String[] followerIds = followersString.split(",");
        
        for (String followerId : followerIds) {
            try {
                Long followerIdLong = Long.parseLong(followerId.trim());
                
                // Create notification
                Notification notification = new Notification();
                notification.setUserId(followerIdLong);
                notification.setSenderId(recruiterUserId);
                notification.setType("new_job_posted");
                notification.setMessage(recruiterName + " posted a new job: " + jobTitle);
                notification.setIsRead(false);
                
                // Save to database
                Notification savedNotification = notificationRepository.save(notification);
                
                // Send real-time notification via Pusher
                sendPusherNotification(followerIdLong, savedNotification);
                
            } catch (NumberFormatException e) {
                System.err.println("❌ Error parsing follower ID: " + followerId);
            }
        }
        
        System.out.println("✅ Notifications sent to " + followerIds.length + " followers");
    }

    public void notifyCandidatesByJobLocation(String jobLocation, String jobTitle, String recruiterName) {
        try {
            if (jobLocation == null || jobLocation.isEmpty()) {
                return;
            }
            
            // Get all candidates with matching location (comparing by ville/city)
            List<Candidat> candidatesInLocation = candidatRepository.findAll()
                    .stream()
                    .filter(candidat -> {
                        if (candidat.getLocalisation() == null) {
                            return false;
                        }
                        String candidatCity = candidat.getLocalisation().getVille();
                        return candidatCity != null && 
                                candidatCity.toLowerCase().contains(jobLocation.toLowerCase());
                    })
                    .toList();
            
            if (candidatesInLocation.isEmpty()) {
                return;
            }
            
            String message = "New job opportunity in " + jobLocation + ": " + jobTitle + " by " + recruiterName;
            
            for (Candidat candidate : candidatesInLocation) {
                try {
                    Notification notification = new Notification();
                    notification.setUserId(candidate.getId());
                    notification.setSenderId(null); // System notification
                    notification.setType("job_location_match");
                    notification.setMessage(message);
                    notification.setIsRead(false);
                    
                    Notification savedNotification = notificationRepository.save(notification);
                    sendPusherNotification(candidate.getId(), savedNotification);
                    
                } catch (Exception e) {
                    System.err.println("Error notifying candidate " + candidate.getId() + ": " + e.getMessage());
                }
            }
            
            System.out.println("✅ Job location notifications sent to " + candidatesInLocation.size() + " candidates in " + jobLocation);
        } catch (Exception e) {
            System.err.println("Error notifying candidates by job location: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Notify candidate when they complete a full parcours
     */
    public void notifyParcoursCompletion(Long userId, String parcoursTitle, Long parcoursId) {
        try {
            Notification notification = new Notification();
            notification.setUserId(userId);
            notification.setSenderId(null); // System notification
            notification.setType("PARCOURS_COMPLETED");
            notification.setMessage("Félicitations ! Vous avez terminé le parcours \"" + parcoursTitle + "\" ! Cliquez ici pour laisser votre avis et nous aider à nous améliorer !");
            notification.setIsRead(false);
            notification.setOffreEmploiId(parcoursId); // Utilisation temporaire pour l'ID du parcours
            
            Notification savedNotification = notificationRepository.save(notification);
            sendPusherNotification(userId, savedNotification);
            
            System.out.println("✅ Parcours completion notification sent to user " + userId + " for parcours " + parcoursId);
        } catch (Exception e) {
            System.err.println("❌ Error sending parcours completion notification: " + e.getMessage());
        }
    }

    /**
     * Delete parcours completion notification after feedback submission
     */
    @org.springframework.transaction.annotation.Transactional
    public void deleteParcoursCompletionNotification(Long userId, Long parcoursId) {
        try {
            notificationRepository.deleteByUserIdAndTypeAndOffreEmploiId(userId, "PARCOURS_COMPLETED", parcoursId);
            System.out.println("✅ Parcours completion notification deleted for user " + userId + " and parcours " + parcoursId);
        } catch (Exception e) {
            System.err.println("❌ Error deleting parcours completion notification: " + e.getMessage());
        }
    }
}

