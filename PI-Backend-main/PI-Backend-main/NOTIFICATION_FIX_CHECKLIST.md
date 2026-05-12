# Notification System Fix - Complete Checklist

## Issues Fixed ✅

### 1. **Database Persistence** ✅
- **Problem**: `sendProfileIncompleteNotification` only sent via Pusher, not saved to DB
- **Fixed**: Updated NotificationService to save notifications to database BEFORE sending via Pusher
- **File**: `src/main/java/t/esprit/arctic/jobmatch/service/NotificationService.java`

### 2. **3-Hour Reminder Scheduler** ✅
- **Problem**: ProfileCheckScheduler was disabled, no recurring reminder system
- **Fixed**: Created new `ProfileIncompleteReminderScheduler` with:
  - `fixedDelay = 10800000` (3 hours in milliseconds)
  - Cron expression: `0 0 0,3,6,9,12,15,18,21 * * *` (every 3 hours)
  - Prevents duplicate notifications by checking for recent ones
- **File**: `src/main/java/t/esprit/arctic/jobmatch/scheduler/ProfileIncompleteReminderScheduler.java`

### 3. **Repository Query Methods** ✅
- **Problem**: Missing repository method to check for recent notifications
- **Fixed**: Added `findByUserIdAndTypeAndCreatedAtAfter` to NotificationRepository
- **File**: `src/main/java/t/esprit/arctic/jobmatch/repository/NotificationRepository.java`

## Notification Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. FIRST LOGIN (Candidate Second Connection)                    │
│    - AuthController detects 2nd login                            │
│    - ProfileCheckService verifies completeness                   │
│    - SendProfileIncompleteNotification called                    │
│      ├─ ✅ SAVE TO DATABASE (NEW!)                             │
│      └─ ✅ SEND VIA PUSHER                                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. EVERY 3 HOURS (ProfileIncompleteReminderScheduler)            │
│    - Check all incomplete profiles                               │
│    - Query DB: No recent notification in last 3 hours?          │
│    - If true: Send new reminder                                  │
│      ├─ ✅ SAVE TO DATABASE                                     │
│      └─ ✅ SEND VIA PUSHER                                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. FRONTEND (Your Responsibility)                                │
│    - Subscribe to Pusher channel: "private-user-{userId}"       │
│    - Listen for "new-notification" event                         │
│    - Display toast/alert to user                                 │
│    - Fallback: Query API for unread notifications                │
└─────────────────────────────────────────────────────────────────┘
```

## Required Configuration ✅

**Pusher Settings** (Already in application.properties):
```properties
# ===== PUSHER CHANNELS =====
pusher.app-id=2137273
pusher.key=07a41117ca80364c7695
pusher.secret=7554b2401cf61effb94b
pusher.cluster=eu
```

## Frontend Integration Checklist

### ✅ 1. Subscribe to Pusher Channel

```typescript
// In your Angular service or component
import Pusher from 'pusher-js';

const pusher = new Pusher('07a41117ca80364c7695', {
  cluster: 'eu',
  channelAuthorization: {
    transport: 'ajax',
    endpoint: '/api/pusher/auth'  // Your backend endpoint
  }
});

// Subscribe to private channel with authentication
const channel = pusher.subscribe(`private-user-${userId}`);

// Listen for notification events
channel.bind('new-notification', (data) => {
  console.log('📢 Notification received:', data);
  if (data.type === 'PROFILE_INCOMPLETE') {
    // Show toast/alert with missing fields
    this.showNotification(data.message, data.missingFields);
  }
});
```

### ✅ 2. Handle Channel Authorization

Your `PusherAuthController` already handles this at `/api/pusher/auth`

### ✅ 3. Fallback: Fetch from API

```typescript
// Fetch unread notifications on app load
this.notificationService.getUnreadNotifications().subscribe(
  (notifications) => {
    notifications.forEach(n => {
      if (n.type === 'PROFILE_INCOMPLETE' && !n.isRead) {
        this.showNotification(n.message);
      }
    });
  }
);
```

## Testing Steps

### Test 1: Verify Database Save
```sql
-- Check notifications table
SELECT * FROM notifications 
WHERE type = 'PROFILE_INCOMPLETE' 
ORDER BY created_at DESC LIMIT 5;
```

### Test 2: Verify Scheduler Runs
- Check application logs for:
  ```
  🔔 Starting profile incomplete reminder scheduler (every 3 hours)...
  ✅ Profile incomplete reminder sent to candidate ID: X (Y%)
  ```

### Test 3: Verify Pusher
- Check logs for:
  ```
  ✅ Profile incomplete notification sent via Pusher to private-user-{userId}
  ```

### Test 4: Frontend Receives Event
- Open browser console
- Should see: `📢 Notification received: {...}`

## Troubleshooting

### ❌ No Notifications Received?

1. **Check Backend Logs**
   - Is the scheduler running? Look for `🔔 Starting profile incomplete reminder scheduler`
   - Is Pusher connection successful? Look for `✅ Profile incomplete notification sent via Pusher`

2. **Check Frontend Logs**
   - Is Pusher subscription working? Look for `private-user-{userId}` subscription
   - Is the channel authenticated? Check `/api/pusher/auth` endpoint response

3. **Check Database**
   - Are notifications being saved?
   ```sql
   SELECT * FROM notifications WHERE type = 'PROFILE_INCOMPLETE' LIMIT 5;
   ```

4. **Check Pusher Credentials**
   - Verify `pusher.key` and `pusher.cluster` match your Pusher dashboard
   - Ensure frontend has same credentials

### ❌ Scheduler Not Running?

- Enable `@EnableScheduling` in your main Spring Boot application class:
  ```java
  @SpringBootApplication
  @EnableScheduling
  public class JobMatchApplication {
      public static void main(String[] args) {
          SpringApplication.run(JobMatchApplication.class, args);
      }
  }
  ```

### ❌ Pusher Not Triggering?

- Verify channel name format: Must be exactly `private-user-{userId}`
- Check Pusher app ID, key, secret in application.properties
- Ensure cluster is set to `eu` (for your region)

## Notification Types

### Profile Incomplete (NEW)
- **Type**: `PROFILE_INCOMPLETE`
- **Trigger**: 2nd login with incomplete profile + every 3 hours
- **Message**: `"Your profile is incomplete. Missing: [fields]"`
- **Channel**: `private-user-{userId}`

### Interview Reminder
- **Type**: `interview_reminder`
- **Trigger**: 1 hour before interview
- **Scheduler**: `EntretienReminderScheduler` (every 1 minute check)

### Follow Notification
- **Type**: `follow`
- **Trigger**: When someone follows you
- **Message**: `"{Name} started following you"`

## Database Schema

```
notifications table:
- id (Long, PK)
- user_id (Long) - recipient
- sender_id (Long, nullable) - who sent it
- type (String) - notification type
- message (String) - notification message
- is_read (Boolean)
- created_at (LocalDateTime)
- entretien_id (Long, nullable)
- offre_emploi_id (Long, nullable)
```

## Next Steps (Frontend)

1. Implement Pusher subscription in your notification service
2. Add UI component to display notifications
3. Add toast/alert when PROFILE_INCOMPLETE notification arrives
4. Test the complete flow end-to-end
5. Monitor logs for any issues

---

**Last Updated**: April 16, 2026
**Status**: Ready for testing ✅
