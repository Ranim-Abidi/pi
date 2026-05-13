package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import t.esprit.arctic.jobmatch.entity.*;
import t.esprit.arctic.jobmatch.repository.OffrePartenaireRepository;
import t.esprit.arctic.jobmatch.repository.PartenaireRepository;

import java.util.*;

@Service
@RequiredArgsConstructor
public class OffrePredictionService {

    private final OffrePartenaireRepository offreRepo;
    private final PartenaireRepository partenaireRepo;

    @Transactional
    public Map<String, Object> predict(Long partenaireId) {

        List<OffrePartenaire> offres =
                offreRepo.findByPartenaireId(partenaireId);

        if (offres == null || offres.isEmpty()) {
            return Map.of(
                    "type", "EMPLOI",
                    "probability", 50.0,
                    "confidence", "LOW",
                    "probaStage", 50.0,
                    "probaEmploi", 50.0
            );
        }

        int nbOffres = offres.size();

        double activityRate = 0.0;
        double anciennete   = 1.0;
        Date premiere = offres.stream()
                .map(OffrePartenaire::getDatePublication)
                .filter(Objects::nonNull)
                .min(Comparator.naturalOrder()).orElse(null);
        if (premiere != null) {
            long diffMs  = new Date().getTime() - premiere.getTime();
            anciennete   = Math.max(1, diffMs / (1000.0 * 60 * 60 * 24 * 7));
            activityRate = Math.round((nbOffres / anciennete) * 100.0) / 100.0;
        }

        Partenaire p = partenaireRepo.findById(partenaireId).orElse(null);
        int typePartenaire = (p != null &&
                p.getType() == TypePartenaire.UNIVERSITE) ? 0 : 1;

        long epinglees = offres.stream()
                .filter(OffrePartenaire::isEpinglee).count();
        double tauxEpinglee =
                Math.round((epinglees * 100.0 / nbOffres) * 10) / 10.0;

        long nbOffreStage = offres.stream()
                .filter(o -> o.getType() == TypeOffrePartenaire.STAGE).count();
        long nbOffreEmploi = offres.stream()
                .filter(o -> o.getType() == TypeOffrePartenaire.EMPLOI).count();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("nbOffres",       nbOffres);
        body.put("activityRate",   activityRate);
        body.put("typePartenaire", typePartenaire);
        body.put("tauxEpinglee",   tauxEpinglee);
        body.put("anciennete",     Math.round(anciennete * 10.0) / 10.0);
        body.put("nbOffreStage",   nbOffreStage);
        body.put("nbOffreEmploi",  nbOffreEmploi);

        Map<String, Object> result = new LinkedHashMap<>();
        double probaEmploi = 45.0 + Math.min(35, nbOffreEmploi * 4.0) - Math.min(20, nbOffreStage * 3.0)
                + Math.min(15, activityRate * 3.0) + (typePartenaire == 0 ? 8 : 0);
        probaEmploi = Math.max(5, Math.min(95, probaEmploi));
        double probaStage = 100.0 - probaEmploi;
        result.put("type", nbOffreEmploi >= nbOffreStage ? "EMPLOI" : "STAGE");
        result.put("probability", probaEmploi);
        result.put("confidence", activityRate > 1.5 ? "MEDIUM" : "LOW");
        result.put("probaStage", Math.round(probaStage * 10.0) / 10.0);
        result.put("probaEmploi", Math.round(probaEmploi * 10.0) / 10.0);
        result.putAll(body);

        return result;
    }
}