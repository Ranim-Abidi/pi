package t.esprit.arctic.jobmatch.controller;

import com.pusher.rest.Pusher;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.security.JwtService;

@RestController
@RequestMapping("/api/pusher")
@RequiredArgsConstructor
public class PusherAuthController {

    private final ObjectProvider<Pusher> pusherProvider;
    private final JwtService jwtService;

    /**
     * Authenticate private channel subscription
     * Called by frontend before subscribing to private channels
     */
    @PostMapping("/auth")
    public String authenticateChannel(
            @RequestHeader("Authorization") String token,
            @RequestParam String socket_id,
            @RequestParam String channel_name) {
        
        try {
            Pusher pusher = pusherProvider.getIfAvailable();
            if (pusher == null) {
                return "{\"error\": \"Pusher is not configured\"}";
            }
            Long userId = extractUserIdFromToken(token);
            
            String expectedChannelName = "private-user-" + userId;
            if (!channel_name.equals(expectedChannelName)) {
                return "{\"error\": \"Unauthorized channel access\"}";
            }

            String authResponse = pusher.authenticate(socket_id, channel_name);
            return authResponse;
        } catch (Exception e) {
            System.err.println("Channel authentication error: " + e.getMessage());
            e.printStackTrace();
            return "{\"error\": \"Authentication failed\"}";
        }
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
