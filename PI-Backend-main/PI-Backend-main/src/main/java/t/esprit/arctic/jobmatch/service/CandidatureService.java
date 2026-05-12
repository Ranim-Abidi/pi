package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import t.esprit.arctic.jobmatch.dto.CandidatureDTO;
import t.esprit.arctic.jobmatch.entity.Candidat;
import t.esprit.arctic.jobmatch.entity.Candidature;
import t.esprit.arctic.jobmatch.entity.OffreEmploi;
import t.esprit.arctic.jobmatch.repository.CandidatRepository;
import t.esprit.arctic.jobmatch.repository.CandidatureRepository;
import t.esprit.arctic.jobmatch.repository.OffreEmploiRepository;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CandidatureService implements ICandidatureService {

    private final CandidatureRepository candidatureRepository;
    private final CandidatRepository candidatRepository;
    private final OffreEmploiRepository offreEmploiRepository;

    // ==================== CRUD ====================

    @Override
    public CandidatureDTO creerCandidature(CandidatureDTO dto) {

        if (!dto.isAcceptRGPD()) {
            throw new RuntimeException("RGPD obligatoire");
        }

        Candidat candidat = candidatRepository.findById(dto.getCandidatId())
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        Candidature c = new Candidature();
        c.setDateEnvoi(LocalDateTime.now());
        c.setStatut("EN_ATTENTE");
        c.setCandidat(candidat);

        mapDtoToEntity(dto, c);

        // Lier offre
        if (dto.getOffreId() != null) {
            OffreEmploi offre = offreEmploiRepository.findById(dto.getOffreId())
                    .orElseThrow(() -> new RuntimeException("Offre non trouvée"));
            c.setOffreEmploi(offre);
        }

        return convertToDTO(candidatureRepository.save(c));
    }

    @Override
    public CandidatureDTO getCandidatureById(Long id) {
        return convertToDTO(findOrThrow(id));
    }

    @Override
    public List<CandidatureDTO> getCandidaturesByCandidat(Long candidatId) {
        return candidatureRepository.findByCandidatId(candidatId)
                .stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    @Override
    public CandidatureDTO modifierStatut(Long id, String statut) {
        if (!statut.equals("ACCEPTEE") && !statut.equals("REFUSEE")) {
            throw new RuntimeException("Statut invalide");
        }

        Candidature c = findOrThrow(id);
        c.setStatut(statut);
        return convertToDTO(candidatureRepository.save(c));
    }

    @Override
    public void supprimerCandidature(Long id) {
        candidatureRepository.deleteById(id);
    }

    @Override
    public List<CandidatureDTO> rechercherParEntreprise(String entreprise) {
        return candidatureRepository.findAll()
                .stream()
                .filter(c -> c.getOffreEmploi() != null &&
                        c.getOffreEmploi().getEntreprise() != null &&
                        c.getOffreEmploi().getEntreprise().toLowerCase().contains(entreprise.toLowerCase()))
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<CandidatureDTO> filtrerParStatut(String statut) {
        return candidatureRepository.findByStatut(statut)
                .stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    @Override
    public List<CandidatureDTO> trierParDate() {
        return candidatureRepository.findAllByOrderByDateEnvoiDesc()
                .stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    @Override
    public CandidatureDTO modifierCandidature(Long id, CandidatureDTO dto) {
        Candidature c = findOrThrow(id);
        mapDtoToEntity(dto, c);
        return convertToDTO(candidatureRepository.save(c));
    }



    //  Taux de réussite
    public Map<String, Object> getTauxReussite(Long candidatId) {
        List<Candidature> list = candidatureRepository.findByCandidatId(candidatId);

        long total = list.size();
        long acceptees = list.stream().filter(c -> "ACCEPTEE".equals(c.getStatut())).count();

        double taux = total > 0 ? (double) acceptees / total * 100 : 0;

        return Map.of(
                "total", total,
                "acceptees", acceptees,
                "taux", Math.round(taux)
        );
    }

    //  Stats par mois
    public List<Map<String, Object>> getStatsParMois(Long candidatId) {
        List<Candidature> list = candidatureRepository.findByCandidatId(candidatId);

        int[] mois = new int[12];

        list.forEach(c -> {
            if (c.getDateEnvoi() != null) {
                mois[c.getDateEnvoi().getMonthValue() - 1]++;
            }
        });

        List<Map<String, Object>> result = new ArrayList<>();

        for (int i = 0; i < 12; i++) {
            result.add(Map.of(
                    "mois", i + 1,
                    "count", mois[i]
            ));
        }

        return result;
    }

    //  Smart Match
    public List<Map<String, Object>> getSmartMatch(Long candidatId) {

        List<Candidature> candidatures = candidatureRepository.findByCandidatId(candidatId);

        Set<String> skills = new HashSet<>();
        candidatures.forEach(c -> {
            if (c.getCompetences() != null) {
                Arrays.stream(c.getCompetences().split(","))
                        .map(String::trim)
                        .map(String::toLowerCase)
                        .forEach(skills::add);
            }
        });

        return offreEmploiRepository.findAll().stream().map(offre -> {

                    String texte = (offre.getDescription() + " " + offre.getTitre()).toLowerCase();

                    long match = skills.stream().filter(texte::contains).count();

                    int score = skills.size() > 0 ? (int) (match * 100 / skills.size()) : 0;

                    return Map.<String, Object>of(
                            "offre", offre.getTitre(),
                            "entreprise", offre.getEntreprise(),
                            "score", score
                    );
                }).sorted((a, b) -> (int) b.get("score") - (int) a.get("score"))
                .collect(Collectors.toList());
    }

    // ==================== UTILS ====================

    private Candidature findOrThrow(Long id) {
        return candidatureRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Candidature non trouvée"));
    }

    private void mapDtoToEntity(CandidatureDTO dto, Candidature c) {
        if (dto.getNomComplet() != null) c.setNomComplet(dto.getNomComplet());
        if (dto.getEmail() != null) c.setEmail(dto.getEmail());
        if (dto.getTelephone() != null) c.setTelephone(dto.getTelephone());
        if (dto.getDescription() != null) c.setDescription(dto.getDescription());
        if (dto.getFormation() != null) c.setFormation(dto.getFormation());
        if (dto.getExperience() != null) c.setExperience(dto.getExperience());
        if (dto.getCompetences() != null) c.setCompetences(dto.getCompetences());
        if (dto.getLettreMotivation() != null) c.setLettreMotivation(dto.getLettreMotivation());
        if (dto.getDateDisponibilite() != null) c.setDateDisponibilite(dto.getDateDisponibilite());
        if (dto.getPreavis() != null) c.setPreavis(dto.getPreavis());
        if (dto.getAcceptContact() != null) c.setAcceptContact(dto.getAcceptContact());

        c.setAcceptRGPD(dto.isAcceptRGPD());
    }

    private CandidatureDTO convertToDTO(Candidature c) {
        CandidatureDTO dto = new CandidatureDTO();

        dto.setId(c.getId());
        dto.setDateEnvoi(c.getDateEnvoi());
        dto.setStatut(c.getStatut());
        dto.setNomComplet(c.getNomComplet());
        dto.setEmail(c.getEmail());
        dto.setTelephone(c.getTelephone());
        dto.setDescription(c.getDescription());
        dto.setFormation(c.getFormation());
        dto.setExperience(c.getExperience());
        dto.setCompetences(c.getCompetences());
        dto.setLettreMotivation(c.getLettreMotivation());

        dto.setDateDisponibilite(c.getDateDisponibilite());
        dto.setPreavis(c.getPreavis());
        dto.setAcceptContact(c.getAcceptContact());
        dto.setAcceptRGPD(c.getAcceptRGPD());
        dto.setScoreEntretien(c.getScoreEntretien());
        dto.setTotalQuestionsEntretien(c.getTotalQuestionsEntretien());
        dto.setBonnesReponsesEntretien(c.getBonnesReponsesEntretien());
      //  dto.setDateEvaluationEntretien(c.getDateEvaluationEntretien());
        dto.setArchive(c.getArchive());
        dto.setArchiveDate(c.getArchiveDate());

        if (c.getCandidat() != null) {
            dto.setCandidatId(c.getCandidat().getId());
            dto.setCandidatNom(c.getCandidat().getNom());
        }

        return dto;
    }
}