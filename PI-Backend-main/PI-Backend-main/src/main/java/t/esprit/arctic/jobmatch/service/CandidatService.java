package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import t.esprit.arctic.jobmatch.entity.Background;
import t.esprit.arctic.jobmatch.entity.Candidat;
import t.esprit.arctic.jobmatch.entity.Competence;
import t.esprit.arctic.jobmatch.entity.Education;
import t.esprit.arctic.jobmatch.entity.Localisation;
import t.esprit.arctic.jobmatch.exception.ResourceNotFoundException;
import t.esprit.arctic.jobmatch.repository.BackgroundRepository;
import t.esprit.arctic.jobmatch.repository.CandidatRepository;
import t.esprit.arctic.jobmatch.repository.CompetenceRepository;
import t.esprit.arctic.jobmatch.repository.EducationRepository;
import t.esprit.arctic.jobmatch.repository.LocalisationRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CandidatService {

    private final CandidatRepository repository;
    private final EducationRepository educationRepository;
    private final LocalisationRepository localisationRepository;
    private final BackgroundRepository backgroundRepository;
    private final CompetenceRepository competenceRepository;

    @Transactional
    public Candidat create(Candidat candidat) {
        // Do not touch lazy relation collections here.
        // Candidate profile uses concatenated fields and may come as partial payload.
        return repository.save(candidat);
    }

    public List<Candidat> getAll() {
        return repository.findAll();
    }

    public Candidat getById(Long id) {
        return repository.findById(id).orElseThrow(() -> 
            new ResourceNotFoundException("Candidat not found with id: " + id));
    }

    @Transactional
    public Candidat update(Long id, Candidat candidatDetails) {
        Candidat candidat = getById(id);
        
        // Update only fields that are provided (not null)
        if (candidatDetails.getNom() != null) {
            candidat.setNom(candidatDetails.getNom());
        }
        if (candidatDetails.getPrenom() != null) {
            candidat.setPrenom(candidatDetails.getPrenom());
        }
        if (candidatDetails.getEmail() != null) {
            candidat.setEmail(candidatDetails.getEmail());
        }
        if (candidatDetails.getTelephone() != null) {
            candidat.setTelephone(candidatDetails.getTelephone());
        }
        if (candidatDetails.getDescription() != null) {
            candidat.setDescription(candidatDetails.getDescription());
        }
        if (candidatDetails.getCv() != null) {
            candidat.setCv(candidatDetails.getCv());
        }
        if (candidatDetails.getCvUrl() != null) {
            candidat.setCvUrl(candidatDetails.getCvUrl());
        }
        if (candidatDetails.getProfilePictureUrl() != null) {
            candidat.setProfilePictureUrl(candidatDetails.getProfilePictureUrl());
        }
        if (candidatDetails.getLienPortfolio() != null) {
            candidat.setLienPortfolio(candidatDetails.getLienPortfolio());
        }
        if (candidatDetails.getNiveauEtude() != null) {
            candidat.setNiveauEtude(candidatDetails.getNiveauEtude());
        }
        if (candidatDetails.getCompetences() != null && !candidatDetails.getCompetences().isEmpty()) {
            candidat.setCompetences(candidatDetails.getCompetences());
        }
        if (candidatDetails.getBackgroundExpertise() != null) {
            candidat.setBackgroundExpertise(candidatDetails.getBackgroundExpertise());
        }
        if (candidatDetails.getPassionAndGoals() != null) {
            candidat.setPassionAndGoals(candidatDetails.getPassionAndGoals());
        }
        
        // Update localisation only if provided
        if (candidatDetails.getLocalisation() != null) {
            candidat.setLocalisation(candidatDetails.getLocalisation());
        }
        
        // Handle localisationId if provided (when sent from frontend as localisation_id)
        if (candidatDetails.getLocalisationId() != null) {
            Localisation localisation = localisationRepository.findById(candidatDetails.getLocalisationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Localisation not found with id: " + candidatDetails.getLocalisationId()));
            candidat.setLocalisation(localisation);
        }
        
        return repository.save(candidat);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }

    public Candidat findByEmail(String email) {
        return repository.findByEmail(email).orElseThrow(() -> 
            new ResourceNotFoundException("Candidat not found with email: " + email));
    }

    @Transactional
    public Candidat updateCompetencesFromStrings(Long id, List<String> competenceNames) {
        Candidat candidat = getById(id);

        List<Competence> competences = competenceNames.stream()
                .map(name -> {
                    // Cherche d'abord la compétence existante (insensible à la casse)
                    return competenceRepository.findFirstByNom(name)
                            .orElseGet(() -> {
                                // Créer une nouvelle compétence avec des valeurs valides par défaut
                                Competence newComp = new Competence();
                                newComp.setNom(name);
                                newComp.setNiveau("Intermédiaire"); // valeur acceptée par @Pattern
                                newComp.setType("Technique");       // min 2 chars ✓
                                try {
                                    return competenceRepository.save(newComp);
                                } catch (Exception e) {
                                    // Si doublon ou contrainte, chercher à nouveau
                                    return competenceRepository.findFirstByNom(name)
                                            .orElseThrow(() -> new RuntimeException(
                                                "Impossible de créer la compétence : " + name));
                                }
                            });
                })
                .collect(Collectors.toList());

        candidat.setCompetences(competences);
        return repository.save(candidat);
    }
}

