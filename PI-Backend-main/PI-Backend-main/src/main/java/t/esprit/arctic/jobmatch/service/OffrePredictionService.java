package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import t.esprit.arctic.jobmatch.entity.*;
import t.esprit.arctic.jobmatch.repository.OffrePartenaireRepository;
import t.esprit.arctic.jobmatch.repository.PartenaireRepository;

import java.util.*;

@Service
@RequiredArgsConstructor
public class OffrePredictionService {

    private final OffrePartenaireRepository offreRepo;
    private final PartenaireRepository partenaireRepo;

    @Value("${flask.ml.url}")
    private String flaskUrl;

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


        RestTemplate rest = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> req =
                new HttpEntity<>(body, headers);

        Map<String, Object> result = new LinkedHashMap<>();

        try {
            ResponseEntity<Map> response = rest.postForEntity(
                    flaskUrl + "/predict", req, Map.class
            );

            Map<String, Object> flaskResponse = response.getBody();

            if (flaskResponse != null) {
                result.putAll(flaskResponse);
            }

        } catch (Exception e) {

            result.put("type", "EMPLOI");
            result.put("probability", 50.0);
            result.put("confidence", "LOW");
            result.put("probaStage", 50.0);
            result.put("probaEmploi", 50.0);
        }


        result.putAll(body);

        return result;
    }
}