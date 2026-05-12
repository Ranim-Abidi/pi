package t.esprit.arctic.jobmatch.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.service.NotificationPartenaireService;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications-partenaire")
@RequiredArgsConstructor
public class NotificationPartenaireController {

    private final NotificationPartenaireService
            notificationPartenaireService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Map<String, Object>>>
    getNotifications(@PathVariable Long userId) {
        return ResponseEntity.ok(
                notificationPartenaireService
                        .getNotifications(userId));
    }

    @GetMapping("/user/{userId}/count")
    public ResponseEntity<Long> countNonLues(
            @PathVariable Long userId) {
        return ResponseEntity.ok(
                notificationPartenaireService
                        .countNonLues(userId));
    }

    @PutMapping("/user/{userId}/lue/{notifId}")
    public ResponseEntity<Void> marquerLue(
            @PathVariable Long userId,
            @PathVariable String notifId) {
        notificationPartenaireService
                .marquerLue(userId, notifId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/user/{userId}/toutes-lues")
    public ResponseEntity<Void> marquerToutesLues(
            @PathVariable Long userId) {
        notificationPartenaireService
                .marquerToutesLues(userId);
        return ResponseEntity.ok().build();
    }
}
