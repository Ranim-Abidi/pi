package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import t.esprit.arctic.jobmatch.dto.MessageDTO;
import t.esprit.arctic.jobmatch.entity.Candidat;
import t.esprit.arctic.jobmatch.entity.Candidature;
import t.esprit.arctic.jobmatch.entity.Message;
import t.esprit.arctic.jobmatch.repository.CandidatureRepository;
import t.esprit.arctic.jobmatch.repository.MessageRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {
    
    private final MessageRepository messageRepository;
    private final CandidatureRepository candidatureRepository;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    public MessageDTO envoyerMessage(MessageDTO dto, String senderEmail, String senderName) {
        if (dto.getReceiverEmail() == null || dto.getReceiverEmail().isBlank()) {
            throw new IllegalArgumentException("Destinataire manquant");
        }

        if (dto.getContenu() == null || dto.getContenu().isBlank()) {
            throw new IllegalArgumentException("Contenu du message manquant");
        }

        Message message = new Message();
        message.setSubject(dto.getSubject() != null && !dto.getSubject().isBlank() ? dto.getSubject() : "Nouveau message");
        message.setContenu(dto.getContenu());
        message.setSenderEmail(senderEmail);
        message.setSenderName(senderName != null && !senderName.isBlank() ? senderName : senderEmail);
        message.setReceiverEmail(dto.getReceiverEmail().trim());
        message.setReceiverName(dto.getReceiverName());
        message.setDateEnvoi(LocalDateTime.now());
        message.setLu(false);
        message.setType(dto.getType() != null && !dto.getType().isBlank() ? dto.getType() : "CHAT");

        Message saved = messageRepository.save(message);
        envoyerEmail(
                saved.getReceiverEmail(),
                saved.getSubject(),
                buildChatEmailContent(saved.getContenu(), saved.getSenderName(), saved.getSenderEmail())
        );

        return convertToDTO(saved);
    }
    
    // Envoyer un email et enregistrer le message
    public MessageDTO envoyerEmailCandidature(MessageDTO dto) {
        try {
            // Récupérer la candidature associée
            Candidature candidature = candidatureRepository.findById(dto.getCandidatureId())
                    .orElseThrow(() -> new RuntimeException("Candidature non trouvée"));
            
            // Récupérer le candidat
            Candidat candidat = candidature.getCandidat();
            
            if (candidat == null) {
                throw new RuntimeException("Candidat non trouvé pour cette candidature");
            }
            
            // Créer le message
            Message message = new Message();
            message.setSubject(dto.getSubject());
            message.setContenu(dto.getContenu());
            message.setCandidat(candidat);
            message.setCandidature(candidature);
            message.setDateEnvoi(LocalDateTime.now());
            message.setLu(false);
            message.setType(dto.getType() != null ? dto.getType() : "AUTRE");
            message.setSenderEmail(dto.getSenderEmail() != null ? dto.getSenderEmail() : "noreply@jobmatch.com");
            message.setSenderName(dto.getSenderName() != null ? dto.getSenderName() : "JobMatch");
            message.setReceiverEmail(candidat.getEmail());
            message.setReceiverName(candidat.getNom());
            
            // Enregistrer le message en base de données
            Message saved = messageRepository.save(message);
            
            // Envoyer l'email
            envoyerEmail(candidat.getEmail(), dto.getSubject(), buildEmailContent(dto.getContenu(), candidat));
            
            return convertToDTO(saved);
        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi de l'email: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Erreur lors de l'envoi de l'email: " + e.getMessage());
        }
    }
    
    // Méthode helper pour envoyer l'email
    private void envoyerEmail(String to, String subject, String content) {
        try {
            JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
            if (mailSender == null) {
                System.out.println("JavaMailSender non configuré: email non envoyé, message conservé en base.");
                return;
            }

            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject(subject);
            message.setText(content);
            message.setFrom("noreply@jobmatch.com");
            
            mailSender.send(message);
            System.out.println("Email envoyé avec succès à: " + to);
        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi de l'email: " + e.getMessage());
            // Ne pas lever l'exception pour que le message soit enregistré même sans email
        }
    }
    
    // Construire le contenu de l'email
    private String buildEmailContent(String message, Candidat candidat) {
        return "Bonjour " + candidat.getNom() + ",\n\n" +
                message + "\n\n" +
                "Cordialement,\n" +
                "L'équipe JobMatch";
    }

    private String buildChatEmailContent(String message, String senderName, String senderEmail) {
        String displaySender = senderName != null && !senderName.isBlank() ? senderName : senderEmail;
        return "Nouveau message de " + displaySender + ":\n\n" +
                message + "\n\n" +
                "Connectez-vous à votre boîte de messagerie pour répondre.";
    }
    
    // Récupérer les messages pour un candidat
    public List<MessageDTO> getMessagesForCandidat(Long candidatId) {
        return messageRepository.findByCandidatIdOrderByDateEnvoiDesc(candidatId)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<MessageDTO> getMessagesForUser(String email) {
        return messageRepository.findBySenderEmailOrReceiverEmailOrderByDateEnvoiDesc(email, email)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    // Récupérer les messages non lus pour un candidat
    public List<MessageDTO> getUnreadMessagesForCandidat(Long candidatId) {
        return messageRepository.findByCandidatIdAndLuFalseOrderByDateEnvoiDesc(candidatId)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<MessageDTO> getUnreadMessagesForUser(String email) {
        return messageRepository.findByReceiverEmailAndLuFalseOrderByDateEnvoiDesc(email)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    // Compter les messages non lus pour un candidat
    public long countUnreadMessages(Long candidatId) {
        return messageRepository.countByCandidatIdAndLuFalse(candidatId);
    }

    public long countUnreadMessagesForUser(String email) {
        return messageRepository.countByReceiverEmailAndLuFalse(email);
    }
    
    // Marquer un message comme lu
    public MessageDTO marquerMessageCommeLu(Long messageId, String currentUserEmail) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message non trouvé"));

        if (currentUserEmail != null && !currentUserEmail.isBlank()) {
            boolean isReceiver = currentUserEmail.equalsIgnoreCase(String.valueOf(message.getReceiverEmail()));
            boolean isSender = currentUserEmail.equalsIgnoreCase(String.valueOf(message.getSenderEmail()));
            if (!isReceiver && !isSender) {
                throw new RuntimeException("Accès refusé au message");
            }
        }
        
        message.setLu(true);
        Message updated = messageRepository.save(message);
        
        return convertToDTO(updated);
    }
    
    // Supprimer un message
    public void supprimerMessage(Long messageId) {
        messageRepository.deleteById(messageId);
    }
    
    // Convertir Message en MessageDTO
    private MessageDTO convertToDTO(Message message) {
        MessageDTO dto = new MessageDTO();
        dto.setId(message.getId());
        dto.setSubject(message.getSubject());
        dto.setContenu(message.getContenu());
        dto.setSenderEmail(message.getSenderEmail());
        dto.setSenderName(message.getSenderName());
        dto.setReceiverEmail(message.getReceiverEmail());
        dto.setReceiverName(message.getReceiverName());
        dto.setDateEnvoi(message.getDateEnvoi());
        dto.setLu(message.isLu());
        dto.setType(message.getType());
        dto.setCandidatId(message.getCandidat() != null ? message.getCandidat().getId() : null);
        dto.setCandidatureId(message.getCandidature() != null ? message.getCandidature().getId() : null);
        return dto;
    }
}
