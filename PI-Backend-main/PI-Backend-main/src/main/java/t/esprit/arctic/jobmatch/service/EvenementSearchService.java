package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import t.esprit.arctic.jobmatch.dto.EvenementResponse;
import t.esprit.arctic.jobmatch.dto.EvenementSearchDTO;
import t.esprit.arctic.jobmatch.entity.Candidat;
import t.esprit.arctic.jobmatch.entity.Evenement;
import t.esprit.arctic.jobmatch.entity.RechercheHistorique;
import t.esprit.arctic.jobmatch.repository.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EvenementSearchService {

    private final EvenementRepository evenementRepository;
    private final ParticipationRepository participationRepository;
    private final FeedbackEventRepository feedbackEventRepository;
    private final RechercheHistoriqueRepository rechercheHistoriqueRepository;
    private final CandidatRepository candidatRepository;


    @Transactional
    public EvenementSearchDTO rechercher(String terme, Long candidatId) {


        List<Evenement> tous = evenementRepository.findAll();

        List<EvenementResponse> resultats = tous.stream()
                .filter(ev -> matchRecherche(ev, terme))
                .map(this::toResponse)
                .collect(Collectors.toList());


        if (terme != null && !terme.isBlank() && candidatId != null) {
            sauvegarderHistorique(terme.trim(), candidatId);
        }


        List<EvenementResponse> suggestions = getSuggestions(candidatId);


        List<String> historique = getHistorique(candidatId);

        return EvenementSearchDTO.builder()
                .resultats(resultats)
                .suggestions(suggestions)
                .historiqueRecherches(historique)
                .totalResultats(resultats.size())
                .build();
    }


    private boolean matchRecherche(Evenement ev, String terme) {
        if (terme == null || terme.isBlank()) return true;


        String q = normaliser(terme);


        String[] mots = q.split("\\s+");
        for (String mot : mots) {
            boolean motTrouve =
                    normaliser(ev.getTitre()).contains(mot) ||
                            normaliser(ev.getLieu()).contains(mot) ||
                            normaliser(ev.getType()).contains(mot) ||

                            (ev.getDateHeure() != null &&
                                    String.valueOf(ev.getDateHeure().getYear()).contains(mot));

            if (!motTrouve) return false;
        }
        return true;
    }


    public List<EvenementResponse> getSuggestions(Long candidatId) {
        if (candidatId == null) return List.of();


        List<String> typesFavorisParticipation =
                participationRepository.findTypeFavoriByCandidat(candidatId);

        List<String> typesFavorisFeedback =
                feedbackEventRepository.findTypesFavorisParCandidat(candidatId);

        Set<String> typesCibles = new LinkedHashSet<>();
        typesCibles.addAll(typesFavorisParticipation);
        typesCibles.addAll(typesFavorisFeedback);

        if (typesCibles.isEmpty()) return List.of();

        LocalDateTime maintenant = LocalDateTime.now();

        return evenementRepository.findAll().stream()
                .filter(ev -> ev.getDateHeure() != null && ev.getDateHeure().isAfter(maintenant))
                .filter(ev -> typesCibles.contains(ev.getType()))
                .filter(ev -> !participationRepository
                        .existsByCandidatIdAndEvenementId(candidatId, ev.getId()))
                .limit(5) // max 5 suggestions
                .map(this::toResponse)
                .collect(Collectors.toList());
    }


    public List<String> getHistorique(Long candidatId) {
        if (candidatId == null) return List.of();

        return rechercheHistoriqueRepository
                .findByCandidatIdOrderByDateRechercheDesc(candidatId)
                .stream()
                .map(RechercheHistorique::getTerme)
                .limit(5)
                .collect(Collectors.toList());
    }


    private void sauvegarderHistorique(String terme, Long candidatId) {
        Candidat candidat = candidatRepository.findById(candidatId).orElse(null);
        if (candidat == null) return;


        if (rechercheHistoriqueRepository.existsByCandidatIdAndTerme(candidatId, terme)) {
            rechercheHistoriqueRepository.deleteByCandidatIdAndTerme(candidatId, terme);
        }


        List<RechercheHistorique> historique =
                rechercheHistoriqueRepository.findByCandidatIdOrderByDateRechercheDesc(candidatId);
        if (historique.size() >= 10) {

            historique.subList(9, historique.size())
                    .forEach(rechercheHistoriqueRepository::delete);
        }

        // Sauvegarde la nouvelle entrée
        rechercheHistoriqueRepository.save(
                RechercheHistorique.builder()
                        .terme(terme)
                        .dateRecherche(LocalDateTime.now())
                        .candidat(candidat)
                        .build()
        );
    }

    private String normaliser(String texte) {
        if (texte == null) return "";
        return java.text.Normalizer
                .normalize(texte, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase();
    }


    private EvenementResponse toResponse(Evenement ev) {
        return new EvenementResponse(
                ev.getId(),
                ev.getTitre(),
                ev.getDateHeure(),
                ev.getLieu(),
                ev.getType(),
                ev.getOrganisateur() != null ? ev.getOrganisateur().getId() : null,
                ev.getOrganisateur() != null ? ev.getOrganisateur().getNom() : null,
                ev.isChatOuvert()
        );
    }
}