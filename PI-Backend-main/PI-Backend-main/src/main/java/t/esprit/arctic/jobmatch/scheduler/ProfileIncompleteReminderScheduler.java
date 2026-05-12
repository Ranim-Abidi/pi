package t.esprit.arctic.jobmatch.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * DISABLED - Using Pusher real-time notifications only (no database)
 * 
 * Original purpose: Send profile incomplete reminders every 3 hours
 * 
 * Since we're using Pusher-only approach, reminders are sent:
 * 1. On 2nd login (AuthController)
 * 2. Manual re-send if user opens settings/profile
 * 
 * No database queries or scheduled tasks needed.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ProfileIncompleteReminderScheduler {

    // DISABLED - Not needed for Pusher-only approach
}

