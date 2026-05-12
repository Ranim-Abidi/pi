package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import t.esprit.arctic.jobmatch.entity.*;
import t.esprit.arctic.jobmatch.repository.*;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final PartenaireRepository  partenaireRepo;
    private final OffrePartenaireRepository offreRepo;


    @Transactional
    public List<Map<String, Object>> getTopPartenaires() {
        return partenaireRepo.findTopPartenaires()
                .stream()
                .limit(5)
                .map(row -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("nom",row[0]);
                    m.put("nbOffres",row[1]);
                    m.put("nbEmploi",row[2]);
                    m.put("nbStage",row[3]);
                    return m;
                })
                .collect(Collectors.toList());
    }


    @Transactional
    public Map<String, Object> getStatsKeywords() {
        Map<String, Object> stats = new LinkedHashMap<>();

        long stageUniversite  = offreRepo.countByPartenaireTypeAndType(
                TypePartenaire.UNIVERSITE, TypeOffrePartenaire.STAGE);
        long emploiEntreprise = offreRepo.countByPartenaireTypeAndType(
                TypePartenaire.ENTREPRISE, TypeOffrePartenaire.EMPLOI);
        List<OffrePartenaire> epinglees = offreRepo
                .findByEpingleeTrueAndPartenaireStatutActivite("TRES_ACTIF");

        stats.put("stageUniversite",  stageUniversite);
        stats.put("emploiEntreprise",  emploiEntreprise);
        stats.put("nbEpingleesTresActifs", epinglees.size());
        stats.put("offresEpinglees", epinglees.stream()
                .map(o -> Map.of(
                        "titre", o.getTitre() != null ? o.getTitre() : "",
                        "partenaire", o.getPartenaire().getNom(),
                        "type",  o.getType().name()
                )).collect(Collectors.toList()));

        return stats;
    }


    @Transactional
    public List<Map<String, Object>> getScoresPopularite() {
        return partenaireRepo.findAll().stream()
                .sorted((a, b) -> Double.compare(
                        b.getScorePopularite(), a.getScorePopularite()))
                .map(p -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", p.getId());
                    m.put("nom", p.getNom());
                    m.put("scorePopularite", p.getScorePopularite());
                    m.put("statutActivite",  p.getStatutActivite());
                    m.put("nbOffres", p.getOffres() != null ? p.getOffres().size() : 0);
                    return m;
                }).collect(Collectors.toList());
    }
}