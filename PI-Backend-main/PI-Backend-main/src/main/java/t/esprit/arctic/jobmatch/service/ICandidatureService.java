package t.esprit.arctic.jobmatch.service;

import t.esprit.arctic.jobmatch.dto.CandidatureDTO;
import java.util.List;

public interface ICandidatureService {
    CandidatureDTO creerCandidature(CandidatureDTO dto);
    CandidatureDTO getCandidatureById(Long id);
    List<CandidatureDTO> getCandidaturesByCandidat(Long candidatId);
    CandidatureDTO modifierStatut(Long id, String statut);
    void supprimerCandidature(Long id);
    List<CandidatureDTO> rechercherParEntreprise(String entreprise);
    List<CandidatureDTO> filtrerParStatut(String statut);
    List<CandidatureDTO> trierParDate();
    CandidatureDTO modifierCandidature(Long id, CandidatureDTO dto);
}