package t.esprit.arctic.jobmatch.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import java.util.List;

import t.esprit.arctic.jobmatch.entity.Partenaire;
import t.esprit.arctic.jobmatch.entity.TypePartenaire;
import t.esprit.arctic.jobmatch.entity.Utilisateur;
import t.esprit.arctic.jobmatch.entity.Role;

import t.esprit.arctic.jobmatch.repository.PartenaireRepository;
import t.esprit.arctic.jobmatch.repository.UtilisateurRepository;
import java.util.stream.Collectors;
import t.esprit.arctic.jobmatch.dto.PartenaireTopDTO;
import t.esprit.arctic.jobmatch.dto.ComparaisonDTO;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PartenaireService {

    private final PartenaireRepository partenaireRepo;
    private final UtilisateurRepository utilisateurRepo;
    private final NotificationPartenaireService
            notificationPartenaireService;

    public List<Partenaire> getAll() {
        return partenaireRepo.findAll();
    }

    public Partenaire getById(Long id) {
        return partenaireRepo.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Partenaire non trouvé"));
    }

    public Partenaire create(Partenaire p) {
        if (p.getUtilisateur() != null
                && p.getUtilisateur().getId() != null) {
            Utilisateur utilisateur = utilisateurRepo
                    .findById(p.getUtilisateur().getId())
                    .orElseThrow(() ->
                            new RuntimeException("Utilisateur non trouvé"));
            if (utilisateur.getRole() != Role.ADMIN) {
                throw new RuntimeException(
                        "L'utilisateur doit être ADMIN");
            }
            p.setUtilisateur(utilisateur);
        }

        Partenaire saved = partenaireRepo.save(p);


        notificationPartenaireService.notifierTousCandidats(
                " Nouveau partenaire !",
                "'" + saved.getNom()
                        + "' vient de rejoindre JobMatch !",
                "NOUVEAU_PARTENAIRE"
        );

        return saved;
    }

    public Partenaire update(Long id, Partenaire p) {
        Partenaire existing = getById(id);
        existing.setNom(p.getNom());
        existing.setEmail(p.getEmail());
        existing.setTelephone(p.getTelephone());
        existing.setType(p.getType());
        if (p.getUtilisateur() != null
                && p.getUtilisateur().getId() != null) {
            Utilisateur utilisateur = utilisateurRepo
                    .findById(p.getUtilisateur().getId())
                    .orElseThrow(() ->
                            new RuntimeException("Utilisateur non trouvé"));
            if (utilisateur.getRole() != Role.ADMIN) {
                throw new RuntimeException(
                        "L'utilisateur doit être ADMIN");
            }
            existing.setUtilisateur(utilisateur);
        }
        return partenaireRepo.save(existing);
    }

    public void delete(Long id) {
        partenaireRepo.deleteById(id);
    }

    public List<Partenaire> getByType(TypePartenaire type) {
        return partenaireRepo.findByType(type);
    }

    @Transactional
    public List<PartenaireTopDTO> getTopPartenairesDTO(int limit) {
        return partenaireRepo.findAll()
                .stream()
                .sorted((a, b) -> {
                    int nbA = a.getOffres() != null
                            ? a.getOffres().size() : 0;
                    int nbB = b.getOffres() != null
                            ? b.getOffres().size() : 0;
                    return Integer.compare(nbB, nbA);
                })
                .limit(limit)
                .map(p -> new PartenaireTopDTO(
                        p.getId(),
                        p.getNom(),
                        p.getEmail(),
                        p.getType() != null ? p.getType().name() : "",
                        p.getOffres() != null
                                ? p.getOffres().size() : 0
                ))
                .collect(Collectors.toList());
    }

    @Transactional
    public double calculateActivityRate(Long partenaireId) {
        Partenaire partenaire = getById(partenaireId);

        if (partenaire.getOffres() == null
                || partenaire.getOffres().isEmpty())
            return 0.0;

        int nbOffres = partenaire.getOffres().size();

        java.util.Date premiereOffre = partenaire.getOffres()
                .stream()
                .map(o -> o.getDatePublication())
                .filter(d -> d != null)
                .min(java.util.Comparator.naturalOrder())
                .orElse(null);

        if (premiereOffre == null) return 0.0;

        long diffMs = new java.util.Date().getTime()
                - premiereOffre.getTime();
        double diffSemaines = diffMs
                / (1000.0 * 60 * 60 * 24 * 7);

        if (diffSemaines < 1) diffSemaines = 1;

        return Math.round((nbOffres / diffSemaines)
                * 100.0) / 100.0;
    }

    @Transactional
    public ComparaisonDTO comparerPartenaires(
            Long id1, Long id2) {

        Partenaire p1 = getById(id1);
        Partenaire p2 = getById(id2);

        int nbOffres1 = p1.getOffres() != null
                ? p1.getOffres().size() : 0;
        int nbOffres2 = p2.getOffres() != null
                ? p2.getOffres().size() : 0;

        double taux1 = calculateActivityRate(id1);
        double taux2 = calculateActivityRate(id2);

        double score1 = nbOffres1 + taux1;
        double score2 = nbOffres2 + taux2;

        String meilleur;
        if (score1 > score2) {
            meilleur = p1.getNom();
        } else if (score2 > score1) {
            meilleur = p2.getNom();
        } else {
            meilleur = "Égalité";
        }

        return new ComparaisonDTO(
                p1.getId(), p1.getNom(), nbOffres1, taux1,
                p2.getId(), p2.getNom(), nbOffres2, taux2,
                meilleur
        );
    }


    public void incrementerVues(Long partenaireId) {
        Partenaire partenaire = getById(partenaireId);
        partenaire.setNombreVues(partenaire.getNombreVues() + 1);
        partenaireRepo.save(partenaire);
    }


    public int getNombreVues(Long partenaireId) {
        return getById(partenaireId).getNombreVues();
    }


    public List<Partenaire> getTopParVues(int limit) {
        return partenaireRepo.findAll()
                .stream()
                .sorted((a, b) ->
                        Integer.compare(b.getNombreVues(),
                                a.getNombreVues()))
                .limit(limit)
                .collect(Collectors.toList());
    }


    @Transactional
    public List<Map<String, Object>> getStatsPartenairesJPQL() {
        return partenaireRepo.findTopPartenaires()
                .stream()
                .limit(5)
                .map(row -> {
                    Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("nom",      row[0]);
                    m.put("nbOffres", row[1]);
                    m.put("nbEmploi", row[2]);
                    m.put("nbStage",  row[3]);
                    return m;
                })
                .collect(Collectors.toList());
    }


    @Transactional
    public List<Map<String, Object>> getScoresPopularite() {
        return partenaireRepo.findAll().stream()
                .sorted((a, b) -> Double.compare(
                        b.getScorePopularite(), a.getScorePopularite()))
                .map(p -> {
                    Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("id", p.getId());
                    m.put("nom", p.getNom());
                    m.put("scorePopularite", p.getScorePopularite());
                    m.put("statutActivite",  p.getStatutActivite());
                    m.put("nbOffres", p.getOffres() != null ? p.getOffres().size() : 0);
                    return m;
                })
                .collect(Collectors.toList());
    }
}