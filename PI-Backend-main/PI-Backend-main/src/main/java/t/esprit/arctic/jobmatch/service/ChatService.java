package t.esprit.arctic.jobmatch.service;

import com.pusher.rest.Pusher;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import t.esprit.arctic.jobmatch.dto.ChatMessageRequest;
import t.esprit.arctic.jobmatch.dto.ChatMessageResponse;
import t.esprit.arctic.jobmatch.entity.*;
import t.esprit.arctic.jobmatch.repository.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final EvenementRepository evenementRepository;
    private final CandidatRepository candidatRepository;
    private final ParticipationRepository participationRepository;
    private final ObjectProvider<Pusher> pusherProvider;


    public ChatMessageResponse envoyer(ChatMessageRequest request) {

        Evenement evenement = evenementRepository.findById(request.getEvenementId())
                .orElseThrow(() -> new RuntimeException("Événement non trouvé"));

        if (!evenement.isChatOuvert()) {
            throw new RuntimeException("Le chat n'est pas encore ouvert");
        }


        boolean estOrganisateur = evenement.getOrganisateur() != null
                && evenement.getOrganisateur().getId().equals(request.getCandidatId());


        boolean estConfirme = participationRepository
                .existsByCandidatIdAndEvenementIdAndStatut(
                        request.getCandidatId(),
                        request.getEvenementId(),
                        "CONFIRME"
                );

        if (!estOrganisateur && !estConfirme) {
            throw new RuntimeException("Accès refusé");
        }


        String nomExpediteur;
        Candidat candidat = null;

        if (estOrganisateur) {

            nomExpediteur = evenement.getOrganisateur().getNom();
        } else {

            candidat = candidatRepository.findById(request.getCandidatId())
                    .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));
            nomExpediteur = candidat.getNom() + " " + candidat.getPrenom();
        }

        ChatMessage message = ChatMessage.builder()
                .contenu(request.getContenu())
                .envoyeA(LocalDateTime.now())
                .nomExpediteur(nomExpediteur)
                .evenement(evenement)
                .candidat(candidat)
                .build();

        ChatMessage saved = chatMessageRepository.save(message);
        ChatMessageResponse response = toResponse(saved);

        Pusher pusher = pusherProvider.getIfAvailable();
        if (pusher != null) {
            pusher.trigger(
                    "chat-evenement-" + request.getEvenementId(),
                    "nouveau-message",
                    response
            );
        }

        return response;
    }


    public List<ChatMessageResponse> getMessages(Long evenementId, Long candidatId) {

        Evenement evenement = evenementRepository.findById(evenementId)
                .orElseThrow(() -> new RuntimeException("Événement non trouvé"));

        if (!evenement.isChatOuvert()) {
            throw new RuntimeException("Le chat n'est pas ouvert");
        }


        boolean estOrganisateur = evenement.getOrganisateur() != null
                && evenement.getOrganisateur().getId().equals(candidatId);


        boolean estConfirme = participationRepository
                .existsByCandidatIdAndEvenementIdAndStatut(candidatId, evenementId, "CONFIRME");


        if (!estOrganisateur && !estConfirme) {
            throw new RuntimeException("Accès refusé");
        }

        return chatMessageRepository
                .findByEvenementIdOrderByEnvoyeAAsc(evenementId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public boolean isChatOuvert(Long evenementId) {
        return evenementRepository.findById(evenementId)
                .map(Evenement::isChatOuvert)
                .orElse(false);
    }


    private ChatMessageResponse toResponse(ChatMessage m) {
        return new ChatMessageResponse(
                m.getId(),
                m.getContenu(),
                m.getEnvoyeA(),
                m.getNomExpediteur(),
                m.getEvenement().getId(),
                m.getCandidat() != null ? m.getCandidat().getId() : null
        );
    }
}