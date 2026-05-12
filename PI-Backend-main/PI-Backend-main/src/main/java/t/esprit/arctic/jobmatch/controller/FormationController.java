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
import java.util.*;

import java.util.List;


@RestController
@RequestMapping("/api/formations")
@RequiredArgsConstructor
public class FormationController {

    private final FormationService formationService;
    private final CandidatRepository candidatRepository;
    private final InscriptionFormationRepository inscriptionRepository;


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

        // Charger les compétences (EAGER sur Candidat → pas de problème)
        List<String> competences = new java.util.ArrayList<>();
        if (candidat.getCompetences() != null) {
            candidat.getCompetences().forEach(c -> competences.add(c.getNom()));
        }

        // Identifier les formations déjà inscrites (pour les exclure)
        List<t.esprit.arctic.jobmatch.entity.InscriptionFormation> inscriptions =
                inscriptionRepository.findByCandidatId(candidatId);
        List<Long> termineesIds = inscriptions.stream()
                .filter(i -> i.getFormation() != null)
                .map(i -> i.getFormation().getId())
                .collect(java.util.stream.Collectors.toList());

        // Récupérer toutes les formations actives AVEC leurs compétences (JOIN FETCH)
        List<Formation> toutesFormations = formationService.getAllActivesWithCompetences();

        // Construire le payload pour le service ML Python
        List<java.util.Map<String, Object>> formationsData = toutesFormations.stream().map(f -> {
            List<String> compNames = new java.util.ArrayList<>();
            if (f.getCompetences() != null) {
                f.getCompetences().forEach(c -> compNames.add(c.getNom()));
            }
            java.util.Map<String, Object> m = new java.util.HashMap<>();
            m.put("id", f.getId());
            m.put("titre", f.getTitre() != null ? f.getTitre() : "");
            m.put("description", f.getDescription() != null ? f.getDescription() : "");
            m.put("categorie", f.getCategorie() != null ? f.getCategorie() : "");
            m.put("niveau", f.getNiveau() != null ? f.getNiveau() : "");
            m.put("competences", compNames);
            return m;
        }).collect(java.util.stream.Collectors.toList());

        java.util.Map<String, Object> requestBody = new java.util.HashMap<>();
        requestBody.put("candidat_competences", competences);
        requestBody.put("candidat_niveau", candidat.getNiveauEtude() != null ? candidat.getNiveauEtude() : "");
        requestBody.put("formations_terminees_ids", termineesIds);
        requestBody.put("formations_disponibles", formationsData);

        // Appel direct au service Python ML (port 5000)
        org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
        org.springframework.http.HttpEntity<java.util.Map<String, Object>> entity =
            new org.springframework.http.HttpEntity<>(requestBody, headers);

        List mlResults;
        try {
            mlResults = restTemplate.postForObject("http://127.0.0.1:5000/recommend", entity, List.class);
            if (mlResults == null) mlResults = new java.util.ArrayList<>();
        } catch (Exception e) {
            System.err.println("[ML] Erreur connexion Python : " + e.getMessage());
            return ResponseEntity.status(503).build();
        }

        // Enrichir avec les objets Formation complets
        List<java.util.Map<String, Object>> enrichis = new java.util.ArrayList<>();
        for (Object resObj : mlResults) {
            java.util.Map<String, Object> res = (java.util.Map<String, Object>) resObj;
            Object idRaw = res.get("formation_id");
            if (idRaw == null) continue;
            Long formId = ((Number) idRaw).longValue();

            Formation f = toutesFormations.stream()
                .filter(form -> form.getId().equals(formId))
                .findFirst().orElse(null);
            if (f != null) {
                java.util.Map<String, Object> map = new java.util.HashMap<>();
                map.put("formation", f);
                map.put("score_match", res.get("score_match"));
                map.put("raisons", res.get("raisons"));
                enrichis.add(map);
            }
        }

        return ResponseEntity.ok(enrichis);
    }

    @PostMapping("/analyze-gap/{candidatId}")
    public ResponseEntity<Object> analyzeGap(@PathVariable Long candidatId, @RequestBody java.util.Map<String, String> payload) {
        String targetJob = payload.get("targetJob");
        Candidat candidat = candidatRepository.findById(candidatId)
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        List<Formation> actives = formationService.getAllActivesWithCompetences();

        List<String> competences = new java.util.ArrayList<>();
        if (candidat.getCompetences() != null) {
            candidat.getCompetences().forEach(c -> competences.add(c.getNom()));
        }

        // Charger TOUTES les inscriptions pour exclure ce que le candidat fait déjà
        List<t.esprit.arctic.jobmatch.entity.InscriptionFormation> inscriptions =
            inscriptionRepository.findByCandidatId(candidatId);

        List<Long> termineesIds = inscriptions.stream()
            .filter(i -> i.getFormation() != null)
            .map(i -> i.getFormation().getId())
            .collect(java.util.stream.Collectors.toList());

        List<java.util.Map<String, Object>> coursesData = actives.stream().map(f -> {
            java.util.Map<String, Object> m = new java.util.HashMap<>();
            m.put("id", f.getId());
            m.put("titre", f.getTitre());
            m.put("categorie", f.getCategorie());
            m.put("description", f.getDescription());
            List<String> sk = new java.util.ArrayList<>();
            if(f.getCompetences() != null) f.getCompetences().forEach(c -> sk.add(c.getNom()));
            m.put("competences", sk);
            return m;
        }).collect(java.util.stream.Collectors.toList());

        java.util.Map<String, Object> requestBody = new java.util.HashMap<>();
        requestBody.put("candidat_competences", competences);
        requestBody.put("target_job", targetJob);
        requestBody.put("formations_terminees_ids", termineesIds);
        requestBody.put("formations_disponibles", coursesData);

        try {
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            org.springframework.http.HttpEntity<java.util.Map<String, Object>> entity =
                new org.springframework.http.HttpEntity<>(requestBody, headers);

            Object response = restTemplate.postForObject("http://127.0.0.1:5000/analyze-gap", entity, Object.class);
            
            if (response instanceof java.util.Map) {
                java.util.Map<String, Object> resMap = (java.util.Map<String, Object>) response;
                List<java.util.Map<String, Object>> recs = (List<java.util.Map<String, Object>>) resMap.get("recommended_formations");
                if (recs != null) {
                    for (java.util.Map<String, Object> rec : recs) {
                        Long fId = ((Number) rec.get("formation_id")).longValue();
                        actives.stream().filter(f -> f.getId().equals(fId)).findFirst().ifPresent(f -> rec.put("formation", f));
                    }
                }
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("[GAP] Erreur connexion Python : " + e.getMessage());
            return ResponseEntity.status(503).build();
        }
    }
}

