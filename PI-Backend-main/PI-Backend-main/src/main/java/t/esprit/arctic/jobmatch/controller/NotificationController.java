package t.esprit.arctic.jobmatch.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.entity.Notification;
import t.esprit.arctic.jobmatch.security.JwtService;
import t.esprit.arctic.jobmatch.service.NotificationService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final JwtService jwtService;

    /**
     * Get all notifications for current user
     */
    @GetMapping
    public ResponseEntity<List<Notification>> getNotifications(
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserIdFromToken(token);
        List<Notification> notifications = notificationService.getUserNotifications(userId);
        return ResponseEntity.ok(notifications);
    }

    /**
     * Get unread notifications count
     */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Object>> getUnreadCount(
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserIdFromToken(token);
        long unreadCount = notificationService.getUnreadNotificationCount(userId);

        Map<String, Object> response = new HashMap<>();
        response.put("unreadCount", unreadCount);

        return ResponseEntity.ok(response);
    }

    /**
     * Mark notification as read
     */
    @PostMapping("/{notificationId}/read")
    public ResponseEntity<Notification> markAsRead(@PathVariable Long notificationId) {
        Notification notification = notificationService.markAsRead(notificationId);
        return ResponseEntity.ok(notification);
    }

    /**
     * Mark all notifications as read
     */
    @PostMapping("/mark-all-read")
    public ResponseEntity<Map<String, String>> markAllAsRead(
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserIdFromToken(token);
        notificationService.markAllAsRead(userId);

        Map<String, String> response = new HashMap<>();
        response.put("message", "All notifications marked as read");

        return ResponseEntity.ok(response);
    }

    /**
     * Delete all notifications for current user
     */
    @PostMapping("/delete-all")
    public ResponseEntity<Map<String, String>> deleteAllNotifications(
            @RequestHeader("Authorization") String token) {
        Long userId = extractUserIdFromToken(token);
        notificationService.deleteAllNotifications(userId);

        Map<String, String> response = new HashMap<>();
        response.put("message", "All notifications deleted");

        return ResponseEntity.ok(response);
    }

    /**
     * Extract user ID from JWT token
     */
    private Long extractUserIdFromToken(String token) {
        if (token == null || !token.startsWith("Bearer ")) {
            throw new RuntimeException("Invalid token format");
        }
        String bearerToken = token.substring(7);
        return jwtService.extractId(bearerToken);
    }
}
