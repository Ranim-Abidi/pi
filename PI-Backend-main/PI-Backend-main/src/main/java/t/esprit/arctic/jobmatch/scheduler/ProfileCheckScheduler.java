package t.esprit.arctic.jobmatch.scheduler;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import t.esprit.arctic.jobmatch.service.ProfileCheckService;

@Component
@RequiredArgsConstructor
public class ProfileCheckScheduler {

    private final ProfileCheckService profileCheckService;

    // Scheduler disabled - notifications now sent via Pusher on login
    // Previous: @Scheduled(fixedDelay = 14400000)
    public void checkIncompleteProfilesEvery4Hours() {
        // This method is no longer called - profile incomplete notifications are sent
        // via Pusher when a candidate logs in for the 2nd time
    }
}
