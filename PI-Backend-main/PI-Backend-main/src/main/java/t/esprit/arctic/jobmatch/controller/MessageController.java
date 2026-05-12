package t.esprit.arctic.jobmatch.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.dto.MessageDTO;
import t.esprit.arctic.jobmatch.entity.Candidat;
import t.esprit.arctic.jobmatch.repository.CandidatRepository;
import t.esprit.arctic.jobmatch.service.MessageService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {
    
    private final MessageService messageService;
    private final CandidatRepository candidatRepository;

    private String getCurrentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null ? authentication.getName() : null;
    }
    
    // Envoyer un email pour une candidature
    @PostMapping("/send-email")
    public ResponseEntity<MessageDTO> envoyerEmail(@RequestBody MessageDTO dto) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            boolean isRecruteur = authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_RECRUTEUR") || 
                             a.getAuthority().equals("ROLE_ADMIN"));
            
            if (!isRecruteur) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(null);
            }
            
            MessageDTO result = messageService.envoyerEmailCandidature(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi de l'email: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @PostMapping("/send")
    public ResponseEntity<MessageDTO> sendMessage(@RequestBody MessageDTO dto) {
        try {
            String senderEmail = getCurrentUserEmail();
            if (senderEmail == null || senderEmail.isBlank()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null);
            }

            MessageDTO result = messageService.envoyerMessage(dto, senderEmail, senderEmail);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (IllegalArgumentException e) {
            System.err.println("Erreur validation message: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi du message: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
    
    // Récupérer tous les messages d'un candidat
    @GetMapping("/mes-messages")
    public ResponseEntity<List<MessageDTO>> getMesMessages() {
        try {
            String email = getCurrentUserEmail();
            if (email == null || email.isBlank()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null);
            }

            List<MessageDTO> messages = messageService.getMessagesForUser(email);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            System.err.println("Erreur lors de la récupération des messages: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(List.of());
        }
    }
    
    // Récupérer les messages non lus
    @GetMapping("/non-lus")
    public ResponseEntity<List<MessageDTO>> getMessagesNonLus() {
        try {
            String email = getCurrentUserEmail();
            if (email == null || email.isBlank()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null);
            }

            List<MessageDTO> messages = messageService.getUnreadMessagesForUser(email);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
    
    // Compter les messages non lus
    @GetMapping("/count-non-lus")
    public ResponseEntity<Map<String, Long>> countNonLus() {
        try {
            String email = getCurrentUserEmail();
            if (email == null || email.isBlank()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null);
            }

            long count = messageService.countUnreadMessagesForUser(email);
            return ResponseEntity.ok(Map.of("nonLus", count));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
    
    // Marquer un message comme lu
    @PutMapping("/{id}/lu")
    public ResponseEntity<MessageDTO> marquerCommeLu(@PathVariable Long id) {
        try {
            MessageDTO result = messageService.marquerMessageCommeLu(id, getCurrentUserEmail());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
    
    // Supprimer un message
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> supprimerMessage(@PathVariable Long id) {
        try {
            messageService.supprimerMessage(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
