package t.esprit.arctic.jobmatch.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.Date;
import java.util.Calendar;

import t.esprit.arctic.jobmatch.entity.OffrePartenaire;
import t.esprit.arctic.jobmatch.entity.TypeOffrePartenaire;
import t.esprit.arctic.jobmatch.entity.TypePartenaire;
import t.esprit.arctic.jobmatch.entity.Partenaire;
import t.esprit.arctic.jobmatch.repository.OffrePartenaireRepository;
import t.esprit.arctic.jobmatch.repository.PartenaireRepository;
import t.esprit.arctic.jobmatch.dto.ActivityEvent;        // ← NOUVEAU
import t.esprit.arctic.jobmatch.service.WebSocketService; // ← NOUVEAU

@Service
@RequiredArgsConstructor
public class OffrePartenaireService {

    private final OffrePartenaireRepository offreRepo;
    private final PartenaireRepository partenaireRepo;
    private final WebSocketService webSocketService;

    public List<OffrePartenaire> getAll() {
        return offreRepo.findAll();
    }

    public OffrePartenaire getById(Long id) {
        return offreRepo.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Offre non trouvée"));
    }


    public OffrePartenaire create(OffrePartenaire o) {
        o.setDatePublication(new Date());
        OffrePartenaire saved = offreRepo.save(o);
        System.out.println(" Push WebSocket : " + saved.getTitre());

        Partenaire p  = saved.getPartenaire();
        String nom    = p != null ? p.getNom() : "Partenaire";
        String type   = saved.getType() != null
                ? saved.getType().name() : "EMPLOI";

        webSocketService.sendActivity(new ActivityEvent(
                "NOUVELLE_OFFRE",
                nom,
                type,
                nom + " a publié une offre " + type.toLowerCase(),
                "",
                type.equals("EMPLOI") ? "💼" : "🎓"
        ));

        return saved;
    }


    public OffrePartenaire update(Long id, OffrePartenaire o) {
        OffrePartenaire existing = offreRepo.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Offre non trouvée"));
        existing.setTitre(o.getTitre());
        existing.setDescription(o.getDescription());
        existing.setType(o.getType());
        return offreRepo.save(existing);
    }

    public void delete(Long id) {
        offreRepo.deleteById(id);
    }

    public List<OffrePartenaire> getByPartenaire(Long partenaireId) {
        return offreRepo.findByPartenaireId(partenaireId);
    }

    public List<OffrePartenaire> getByType(TypeOffrePartenaire type) {
        return offreRepo.findByType(type);
    }

    public List<OffrePartenaire> searchByKeyword(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return offreRepo.findAll();
        }
        return offreRepo.searchByKeyword(keyword.trim());
    }

    @Transactional
    public String predictNextOffreType(Long partenaireId) {

        List<OffrePartenaire> offres =
                offreRepo.findByPartenaireId(partenaireId);

        if (offres == null || offres.isEmpty()) {
            return "EMPLOI (50%)";
        }

        long nbEmploi = offres.stream()
                .filter(o -> o.getType() == TypeOffrePartenaire.EMPLOI)
                .count();

        long nbStage = offres.stream()
                .filter(o -> o.getType() == TypeOffrePartenaire.STAGE)
                .count();

        long total = nbEmploi + nbStage;

        double probEmploi = (double) nbEmploi / total;
        double probStage  = (double) nbStage  / total;

        int moisActuel = Calendar.getInstance().get(Calendar.MONTH) + 1;
        boolean periodStage = (moisActuel >= 6 && moisActuel <= 9);

        if (periodStage) {
            probStage  *= 1.5;
        } else {
            probEmploi *= 1.5;
        }

        Partenaire partenaire = partenaireRepo
                .findById(partenaireId).orElse(null);

        if (partenaire != null) {
            if (partenaire.getType() == TypePartenaire.UNIVERSITE) {
                probStage  *= 1.8;
            } else {
                probEmploi *= 1.8;
            }
        }

        List<OffrePartenaire> dernieres = offres.stream()
                .sorted((a, b) -> {
                    if (a.getDatePublication() == null) return 1;
                    if (b.getDatePublication() == null) return -1;
                    return b.getDatePublication()
                            .compareTo(a.getDatePublication());
                })
                .limit(3)
                .collect(java.util.stream.Collectors.toList());

        for (OffrePartenaire o : dernieres) {
            if (o.getType() == TypeOffrePartenaire.EMPLOI) {
                probEmploi *= 1.3;
            } else {
                probStage  *= 1.3;
            }
        }

        double totalProb     = probEmploi + probStage;
        int confidenceEmploi = (int)((probEmploi / totalProb) * 100);
        int confidenceStage  = (int)((probStage  / totalProb) * 100);

        if (probEmploi >= probStage) {
            return "EMPLOI (" + confidenceEmploi + "%)";
        } else {
            return "STAGE ("  + confidenceStage  + "%)";
        }
    }

    public OffrePartenaire toggleEpingle(Long offreId) {
        OffrePartenaire offre = getById(offreId);
        offre.setEpinglee(!offre.isEpinglee());
        return offreRepo.save(offre);
    }

    public List<OffrePartenaire> getByPartenaireTriees(Long partenaireId) {
        return offreRepo.findByPartenaireId(partenaireId)
                .stream()
                .sorted((a, b) -> {
                    if (a.isEpinglee() && !b.isEpinglee())  return -1;
                    if (!a.isEpinglee() && b.isEpinglee())  return 1;
                    return 0;
                })
                .collect(java.util.stream.Collectors.toList());
    }
}