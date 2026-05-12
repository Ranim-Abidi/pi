package t.esprit.arctic.jobmatch.service;

import org.springframework.stereotype.Service;
import t.esprit.arctic.jobmatch.entity.NiveauOrdre;

@Service
public class FeedbackAlertService {

    public void checkLowRating(Long parcoursId, String type, Integer rating) {
        if (rating != null && rating <= 2) {
            System.err.println("🚨 ALERT ADMIN: Low " + type + " rating for Parcours #" + parcoursId + 
                " [Rating: " + rating + "/5]");
            // Real notifications could be added here
        }
    }
}
