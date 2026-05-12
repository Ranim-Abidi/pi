package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import t.esprit.arctic.jobmatch.dto.ActivityEvent;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class WebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    public void sendActivity(ActivityEvent event) {
        event.setTime(LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("HH:mm:ss")));
        messagingTemplate.convertAndSend("/topic/activity", event);
    }

    public void sendDashboardUpdate(Object stats) {
        messagingTemplate.convertAndSend("/topic/dashboard", stats);
    }
}