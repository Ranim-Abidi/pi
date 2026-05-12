package t.esprit.arctic.jobmatch.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.dto.ChatMessageRequest;
import t.esprit.arctic.jobmatch.dto.ChatMessageResponse;
import t.esprit.arctic.jobmatch.service.ChatService;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    // Envoie un message
    @PostMapping
    public ResponseEntity<ChatMessageResponse> envoyer(@RequestBody ChatMessageRequest request) {
        return ResponseEntity.ok(chatService.envoyer(request));
    }

    // Récupère l'historique
    @GetMapping("/evenement/{evenementId}/candidat/{candidatId}")
    public ResponseEntity<List<ChatMessageResponse>> getMessages(
            @PathVariable Long evenementId,
            @PathVariable Long candidatId) {
        return ResponseEntity.ok(chatService.getMessages(evenementId, candidatId));
    }

    // Vérifie si le chat est ouvert
    @GetMapping("/statut/{evenementId}")
    public ResponseEntity<Boolean> getChatStatut(@PathVariable Long evenementId) {
        return ResponseEntity.ok(
                chatService.isChatOuvert(evenementId)
        );
    }
}