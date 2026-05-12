package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import t.esprit.arctic.jobmatch.dto.CandidatStatsResponse;
import t.esprit.arctic.jobmatch.dto.ParticipationRequest;
import t.esprit.arctic.jobmatch.dto.ParticipationResponse;
import t.esprit.arctic.jobmatch.entity.Candidat;
import t.esprit.arctic.jobmatch.entity.Evenement;
import t.esprit.arctic.jobmatch.entity.Participation;
import t.esprit.arctic.jobmatch.repository.CandidatRepository;
import t.esprit.arctic.jobmatch.repository.EvenementRepository;
import t.esprit.arctic.jobmatch.repository.ParticipationRepository;
import t.esprit.arctic.jobmatch.service.QRCodeService;


import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ParticipationService {

    private final ParticipationRepository repository;
    private final EvenementRepository evenementRepository;
    private final CandidatRepository candidatRepository;
    private final QRCodeService qrCodeService;
    private final ParticipationRepository participationRepository;
    private final NotificationService notificationService;


    public ParticipationResponse confirmer(ParticipationRequest request) {
        if (repository.existsByCandidatIdAndEvenementId(
                request.getCandidatId(), request.getEvenementId())) {
            throw new RuntimeException("Candidat déjà inscrit à cet événement");
        }

        Evenement evenement = evenementRepository
                .findById(request.getEvenementId())
                .orElseThrow(() -> new RuntimeException("Événement non trouvé"));

        Candidat candidat = candidatRepository
                .findById(request.getCandidatId())
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        Participation p = Participation.builder()
                .dateInscription(new Date())
                .statut("EN_ATTENTE")
                .evenement(evenement)
                .candidat(candidat)
                .build();

        ParticipationResponse saved = toResponse(repository.save(p));
        
        try {
            notificationService.notifyFollowersOfEventParticipation(
                candidat.getId(),
                candidat.getNom(),
                evenement.getTitre()
            );
        } catch (Exception e) {
            System.err.println("Error notifying followers of event participation: " + e.getMessage());
        }
        
        return saved;
    }

    public ParticipationResponse annuler(Long id) {
        Participation p = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Participation non trouvée"));
        p.setStatut("ANNULE");
        return toResponse(repository.save(p));
    }

    public List<ParticipationResponse> getByEvenement(Long evenementId) {
        return repository.findByEvenementId(evenementId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<ParticipationResponse> getByCandidat(Long candidatId) {
        return repository.findByCandidatId(candidatId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }


    public ParticipationResponse accepter(Long id) {
        Participation p = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Participation non trouvée"));

        p.setStatut("CONFIRME");

        String contenu = String.format(
                "JOBMATCH|PARTICIPATION:%d|CANDIDAT:%d|EVENEMENT:%d|DATE:%s",
                p.getId(),
                p.getCandidat().getId(),
                p.getEvenement().getId(),
                p.getDateInscription().toString()
        );

        try {
            String qrBase64 = qrCodeService.generateQRCode(contenu);
            p.setQrCode(qrBase64);
        } catch (Exception e) {

        }

        repository.save(p);
        return toResponse(p);
    }


    public ParticipationResponse refuser(Long id) {
        Participation p = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Participation non trouvée"));

        p.setStatut("REFUSE");
        repository.save(p);


        return toResponse(p);
    }

    public List<ParticipationResponse> getDemandesByEvenement(Long evenementId) {
        return repository.findByEvenementIdAndStatut(evenementId, "EN_ATTENTE")
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<ParticipationResponse> getConfirmeesByEvenement(Long evenementId) {
        return repository.findByEvenementIdAndStatut(evenementId, "CONFIRME")
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<ParticipationResponse> getDemandesByOrganisateur(Long organisateurId) {
        return repository.findDemandesByOrganisateur(organisateurId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public CandidatStatsResponse getStatsByCandidat(Long candidatId) {
        int total = repository.countByCandidatId(candidatId);
        int confirmees = repository.countByCandidatIdAndStatut(candidatId, "CONFIRME");
        int enAttente = repository.countByCandidatIdAndStatut(candidatId, "EN_ATTENTE");
        int refusees = repository.countByCandidatIdAndStatut(candidatId, "REFUSE");

        List<String> types = repository.findTypeFavoriByCandidat(candidatId);
        String typeFavori = types.isEmpty() ? "Aucun" : types.get(0);

        return new CandidatStatsResponse(total, confirmees, enAttente, refusees, typeFavori);
    }

    public String getQRCode(Long id) {
        Participation p = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Participation non trouvée"));
        if (p.getQrCode() == null) throw new RuntimeException("QR code non disponible");
        return p.getQrCode();
    }


    public List<Participation> findConfirmedByCandidatId(Long candidatId ,String statut ) {
        return participationRepository.findByCandidatIdAndStatut(candidatId, "CONFIRME");
    }

    private ParticipationResponse toResponse(Participation p) {
        return new ParticipationResponse(
                p.getId(),
                p.getDateInscription(),
                p.getStatut(),
                p.getEvenement().getId(),
                p.getEvenement().getTitre(),
                p.getCandidat().getId(),
                p.getCandidat().getNom(),
                p.getQrCode(),
                p.getEvenement().isChatOuvert(),
                p.getCertificateGenerated() != null && p.getCertificateGenerated(), // ← null-safe
                p.getCertificateUrl()
        );
    }
}