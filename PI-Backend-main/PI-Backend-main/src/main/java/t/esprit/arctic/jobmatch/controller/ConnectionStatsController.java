package t.esprit.arctic.jobmatch.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.dto.ConnectionStatsDto;
import t.esprit.arctic.jobmatch.entity.LoginHistory;
import t.esprit.arctic.jobmatch.service.LoginHistoryService;

import java.util.List;

@RestController
@RequestMapping("/api/connections")
@RequiredArgsConstructor
public class ConnectionStatsController {

    private final LoginHistoryService loginHistoryService;

    @GetMapping("/stats/{userId}")
    public ConnectionStatsDto getConnectionStats(@PathVariable Long userId) {
        return loginHistoryService.getConnectionStats(userId);
    }

    @GetMapping("/count/{userId}")
    public java.util.Map<String, Object> getConnectionCount(@PathVariable Long userId) {
        long count = loginHistoryService.countConnectionsByUserId(userId);
        return java.util.Map.of(
                "userId", userId,
                "totalConnections", count
        );
    }

    @GetMapping("/history/{userId}")
    public List<LoginHistory> getLoginHistory(@PathVariable Long userId) {
        return loginHistoryService.getLoginHistoryForUser(userId);
    }

    @GetMapping("/all-stats")
    public List<ConnectionStatsDto> getAllConnectionStats() {
        return loginHistoryService.getAllConnectionStats();
    }
}
