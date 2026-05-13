package t.esprit.arctic.jobmatch.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.entity.Formation;
import t.esprit.arctic.jobmatch.dto.FormationDTO;
import org.springframework.beans.BeanUtils;
import t.esprit.arctic.jobmatch.service.FormationService;
import t.esprit.arctic.jobmatch.entity.Candidat;
import t.esprit.arctic.jobmatch.repository.CandidatRepository;
import t.esprit.arctic.jobmatch.repository.InscriptionFormationRepository;
import t.esprit.arctic.jobmatch.service.RecommendationMLClient;

import java.util.*;
import java.util.List;
import java.util.stream.Collectors;


@RestController
@RequestMapping("/api/formations")
@RequiredArgsConstructor
public class FormationController {

    private final FormationService formationService;
    private final CandidatRepository candidatRepository;
    private final InscriptionFormationRepository inscriptionRepository;
    private final RecommendationMLClient recommendationMLClient;


    @GetMapping("/admin/all")
    public ResponseEntity<List<Formation>> getAllForAdmin() {
        return ResponseEntity.ok(formationService.getAllForAdmin());
    }

    @GetMapping("/admin/archivees")
    public ResponseEntity<List<Formation>> getArchivees() {
        return ResponseEntity.ok(formationService.getArchivees());
    }


    @GetMapping("/niveau/{niveau}")
    public ResponseEntity<List<Formation>> getByNiveau(@PathVariable String niveau) {
        return ResponseEntity.ok(formationService.getByNiveau(niveau));
    }

    @GetMapping("/categorie/{categorie}")
    public ResponseEntity<List<Formation>> getByCategorie(@PathVariable String categorie) {
        return ResponseEntity.ok(formationService.getByCategorie(categorie));
    }


    @GetMapping
    public ResponseEntity<List<Formation>> getAll() {
        return ResponseEntity.ok(formationService.getAllActives());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Formation> getById(@PathVariable Long id) {
        return ResponseEntity.ok(formationService.getById(id));
    }

    @PostMapping
    public ResponseEntity<Formation> create(@Valid @RequestBody FormationDTO formationDto) {
        Formation formation = new Formation();
        BeanUtils.copyProperties(formationDto, formation);
        return ResponseEntity.ok(formationService.create(formation));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Formation> update(@PathVariable Long id, @Valid @RequestBody FormationDTO formationDto) {
        Formation formation = new Formation();
        BeanUtils.copyProperties(formationDto, formation);
        return ResponseEntity.ok(formationService.update(id, formation));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        formationService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/archiver")
    public ResponseEntity<Formation> archiver(@PathVariable Long id) {
        return ResponseEntity.ok(formationService.archiver(id));
    }

    @PutMapping("/{id}/desarchiver")
    public ResponseEntity<Formation> desarchiver(@PathVariable Long id) {
        return ResponseEntity.ok(formationService.desarchiver(id));
    }


    @GetMapping("/stats")
    public ResponseEntity<List<t.esprit.arctic.jobmatch.dto.FormationStatsDTO>> getAllStats() {
        return ResponseEntity.ok(
            formationService.getFormationsAvecStatistiques());
    }

    @GetMapping("/stats/categorie/{categorie}")
    public ResponseEntity<List<t.esprit.arctic.jobmatch.dto.FormationStatsDTO>> getStatsByCategorie(
            @PathVariable String categorie) {
        return ResponseEntity.ok(
            formationService.getStatsParCategorie(categorie));
    }

    @GetMapping("/top")
    public ResponseEntity<List<t.esprit.arctic.jobmatch.dto.FormationStatsDTO>> getTop() {
        return ResponseEntity.ok(formationService.getTopFormations());
    }

    @PostMapping("/refresh")
    public ResponseEntity<java.util.Map<String, Integer>> refreshBadgesAndScores() {
        return ResponseEntity.ok(formationService.refreshScoresEtBadges());
    }


    @GetMapping("/badge/{badge}")
    public ResponseEntity<List<Formation>> getByBadge(
            @PathVariable String badge) {
        return ResponseEntity.ok(
            formationService.getFormationsParBadge(badge));
    }

    @GetMapping("/populaires")
    public ResponseEntity<List<Formation>> getPopulaires(
            @RequestParam(defaultValue = "50") Double scoreMin) {
        return ResponseEntity.ok(
            formationService.getFormationsPopulaires(scoreMin));
    }


    // --- RECOMMANDATIONS ML ---
    @GetMapping("/recommandees/{candidatId}")
    public ResponseEntity<List<java.util.Map<String, Object>>> getRecommandations(@PathVariable Long candidatId) {
        Candidat candidat = candidatRepository.findById(candidatId)
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        // Identifier les formations déjà inscrites (pour les exclure)
        List<t.esprit.arctic.jobmatch.entity.InscriptionFormation> inscriptions =
                inscriptionRepository.findByCandidatId(candidatId);
        List<Long> termineesIds = inscriptions.stream()
                .filter(i -> i.getFormation() != null)
                .map(i -> i.getFormation().getId())
                .collect(java.util.stream.Collectors.toList());

        // Récupérer toutes les formations actives AVEC leurs compétences (JOIN FETCH)
        List<Formation> toutesFormations = formationService.getAllActivesWithCompetences();

        List<Formation> disponibles = toutesFormations.stream()
                .filter(f -> !termineesIds.contains(f.getId()))
                .collect(Collectors.toList());

        List<Map<String, Object>> scored = recommendationMLClient.getRecommendations(candidat, disponibles);

        List<Map<String, Object>> enrichis = new ArrayList<>();
        for (Map<String, Object> res : scored) {
            Long formId = ((Number) res.get("id")).longValue();
            Formation f = toutesFormations.stream()
                    .filter(form -> form.getId().equals(formId))
                    .findFirst()
                    .orElse(null);
            if (f != null) {
                Map<String, Object> map = new HashMap<>();
                map.put("formation", f);
                map.put("score_match", res.get("score"));
                map.put("raisons", res.get("matched_skills"));
                enrichis.add(map);
            }
        }

        return ResponseEntity.ok(enrichis);
    }

    @PostMapping("/analyze-gap/{candidatId}")
    public ResponseEntity<Object> analyzeGap(@PathVariable Long candidatId, @RequestBody Map<String, String> payload) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", "analyze-gap ML désactivé dans ce déploiement");
        body.put("target_job", payload != null ? payload.get("targetJob") : null);
        body.put("recommended_formations", Collections.emptyList());
        body.put("skill_gaps", Collections.emptyList());
        return ResponseEntity.status(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }
}

