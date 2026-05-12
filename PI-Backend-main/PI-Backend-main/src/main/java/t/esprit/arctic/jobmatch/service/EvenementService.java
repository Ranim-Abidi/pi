package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import t.esprit.arctic.jobmatch.dto.EvenementRequest;
import t.esprit.arctic.jobmatch.dto.EvenementResponse;
import t.esprit.arctic.jobmatch.dto.EvenementStatsResponse;
import t.esprit.arctic.jobmatch.entity.Evenement;
import t.esprit.arctic.jobmatch.entity.OrganisateurEvenement;
import t.esprit.arctic.jobmatch.repository.EvenementRepository;
import t.esprit.arctic.jobmatch.repository.OrganisateurEvenementRepository;
import t.esprit.arctic.jobmatch.repository.ParticipationRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EvenementService {

    private final EvenementRepository repository;
    private final OrganisateurEvenementRepository organisateurRepository;
    private final ParticipationRepository participationRepository;


    public EvenementResponse publier(EvenementRequest request) {
        OrganisateurEvenement organisateur = organisateurRepository
                .findById(request.getOrganisateurId())
                .orElseThrow(() -> new RuntimeException("Organisateur non trouvé : " + request.getOrganisateurId()));

        Evenement e = Evenement.builder()
                .titre(request.getTitre())
                .dateHeure(request.getDateHeure())
                .lieu(request.getLieu())
                .type(request.getType())
                .organisateur(organisateur)
                .build();

        return toResponse(repository.save(e));
    }

    public EvenementResponse modifier(Long id, EvenementRequest request, String email) {
        Evenement e = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Événement non trouvé : " + id));

        OrganisateurEvenement organisateur = organisateurRepository
                .findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Organisateur non trouvé"));

        if (!e.getOrganisateur().getId().equals(organisateur.getId())) {
            throw new RuntimeException("Accès refusé : vous n'êtes pas le propriétaire de cet événement");
        }

        e.setTitre(request.getTitre());
        e.setDateHeure(request.getDateHeure());
        e.setLieu(request.getLieu());
        e.setType(request.getType());

        return toResponse(repository.save(e));
    }

    public void annuler(Long id, String email) {
        Evenement e = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Événement non trouvé : " + id));

        OrganisateurEvenement organisateur = organisateurRepository
                .findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Organisateur non trouvé"));

        if (!e.getOrganisateur().getId().equals(organisateur.getId())) {
            throw new RuntimeException("Accès refusé : vous n'êtes pas le propriétaire de cet événement");
        }

        repository.delete(e);
    }


    public List<EvenementResponse> getAll() {
        return repository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }


    public EvenementResponse getById(Long id) {
        return toResponse(repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Événement non trouvé : " + id)));
    }

    public List<EvenementResponse> getByOrganisateur(Long organisateurId) {
        return repository.findByOrganisateurId(organisateurId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ================= MAPPER =================
    private EvenementResponse toResponse(Evenement e) {
        return new EvenementResponse(
                e.getId(),
                e.getTitre(),
                e.getDateHeure(),
                e.getLieu(),
                e.getType(),
                e.getOrganisateur() != null ? e.getOrganisateur().getId() : null,
                e.getOrganisateur() != null ? e.getOrganisateur().getNom() : null,
                e.isChatOuvert()
        );
    }

    // Suppression admin
    public void annulerAdmin(Long id) {
        if (!repository.existsById(id)) {
            throw new RuntimeException("Événement non trouvé : " + id);
        }
        repository.deleteById(id);
    }

    // Stats
    public EvenementStatsResponse getStats(int mois, int annee, Long organisateurId) {
        int totalEvenements = repository
                .countByMoisAndAnneeAndOrganisateur(mois, annee, organisateurId);

        List<Evenement> evenements = repository
                .findByMoisAndAnneeAndOrganisateur(mois, annee, organisateurId);

        int totalConfirmees = participationRepository
                .countByOrganisateurAndMoisAndStatut(organisateurId, mois, annee, "CONFIRME");

        int totalEnAttente = participationRepository
                .countByOrganisateurAndMoisAndStatut(organisateurId, mois, annee, "EN_ATTENTE");

        int totalParticipations = totalConfirmees + totalEnAttente;

        double tauxRemplissage = totalEvenements > 0
                ? (double) totalConfirmees / totalEvenements
                : 0.0;

        String evenementPopulaire = "Aucun";
        int maxParticipations = 0;

        for (Evenement ev : evenements) {
            int nbParticipations = participationRepository.countByEvenementId(ev.getId());
            if (nbParticipations > maxParticipations) {
                maxParticipations = nbParticipations;
                evenementPopulaire = ev.getTitre();
            }
        }

        return new EvenementStatsResponse(
                totalEvenements,
                totalParticipations,
                totalConfirmees,
                totalEnAttente,
                tauxRemplissage,
                evenementPopulaire,
                maxParticipations
        );
    }
}