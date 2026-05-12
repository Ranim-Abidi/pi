package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import t.esprit.arctic.jobmatch.dto.FormationDTO;
import t.esprit.arctic.jobmatch.dto.ParcoursCreateRequest;
import t.esprit.arctic.jobmatch.dto.ParcoursFormationDTO;
import t.esprit.arctic.jobmatch.entity.Formation;
import t.esprit.arctic.jobmatch.entity.ParcoursFormation;
import t.esprit.arctic.jobmatch.repository.FormationRepository;
import t.esprit.arctic.jobmatch.repository.InscriptionParcoursRepository;
import t.esprit.arctic.jobmatch.repository.ParcoursFormationRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ParcoursFormationService {

    private final ParcoursFormationRepository parcoursRepository;
    private final FormationRepository formationRepository;
    private final InscriptionParcoursRepository inscriptionRepository;

    public List<ParcoursFormation> getAll() {
        return parcoursRepository.findAll();
    }

    public ParcoursFormation getById(Long id) {
        return parcoursRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Parcours non trouvé avec l'id : " + id));
    }

    public List<ParcoursFormation> getByCategorie(String categorie) {
        return parcoursRepository.findByCategorie(categorie);
    }

    /**
     * Crée un parcours en liant 4 formations existantes.
     */
    @Transactional
    public ParcoursFormation create(ParcoursFormationDTO dto) {
        ParcoursFormation parcours = new ParcoursFormation();
        parcours.setTitre(dto.getTitre());
        parcours.setCategorie(dto.getCategorie());
        parcours.setImageUrl(dto.getImageUrl());
        parcours.setDescription(dto.getDescription());

        if (dto.getNiveauDebutantId() != null) {
            parcours.setNiveauDebutant(formationRepository.findById(dto.getNiveauDebutantId())
                    .orElseThrow(() -> new RuntimeException("Formation Débutant non trouvée")));
        }
        if (dto.getNiveauIntermediaireId() != null) {
            parcours.setNiveauIntermediaire(formationRepository.findById(dto.getNiveauIntermediaireId())
                    .orElseThrow(() -> new RuntimeException("Formation Intermédiaire non trouvée")));
        }
        if (dto.getNiveauAvanceId() != null) {
            parcours.setNiveauAvance(formationRepository.findById(dto.getNiveauAvanceId())
                    .orElseThrow(() -> new RuntimeException("Formation Avancé non trouvée")));
        }
        if (dto.getNiveauExpertId() != null) {
            parcours.setNiveauExpert(formationRepository.findById(dto.getNiveauExpertId())
                    .orElseThrow(() -> new RuntimeException("Formation Expert non trouvée")));
        }

        return parcoursRepository.save(parcours);
    }

    /**
     * Wizard admin : crée les 4 formations + le parcours en une seule opération.
     */
    @Transactional
    public ParcoursFormation createAvecFormations(ParcoursCreateRequest request) {
        // Créer les 4 formations
        Formation fDebutant = createFormationFromDTO(request.getFormationDebutant(), "Débutant");
        Formation fIntermediaire = createFormationFromDTO(request.getFormationIntermediaire(), "Intermédiaire");
        Formation fAvance = createFormationFromDTO(request.getFormationAvance(), "Avancé");
        Formation fExpert = createFormationFromDTO(request.getFormationExpert(), "Expert");

        // Créer le parcours
        ParcoursFormation parcours = new ParcoursFormation();
        parcours.setTitre(request.getTitre());
        parcours.setCategorie(request.getCategorie());
        parcours.setImageUrl(request.getImageUrl());
        parcours.setDescription(request.getDescription());
        parcours.setNiveauDebutant(fDebutant);
        parcours.setNiveauIntermediaire(fIntermediaire);
        parcours.setNiveauAvance(fAvance);
        parcours.setNiveauExpert(fExpert);

        return parcoursRepository.save(parcours);
    }

    /**
     * Met à jour un parcours et ses 4 formations en une seule opération.
     */
    @Transactional
    public ParcoursFormation updateAvecFormations(Long id, ParcoursCreateRequest request) {
        ParcoursFormation parcours = getById(id);
        parcours.setTitre(request.getTitre());
        parcours.setCategorie(request.getCategorie());
        parcours.setImageUrl(request.getImageUrl());
        parcours.setDescription(request.getDescription());

        parcours.setNiveauDebutant(updateOrCreateFormation(request.getFormationDebutant(), "Débutant", parcours.getNiveauDebutant()));
        parcours.setNiveauIntermediaire(updateOrCreateFormation(request.getFormationIntermediaire(), "Intermédiaire", parcours.getNiveauIntermediaire()));
        parcours.setNiveauAvance(updateOrCreateFormation(request.getFormationAvance(), "Avancé", parcours.getNiveauAvance()));
        parcours.setNiveauExpert(updateOrCreateFormation(request.getFormationExpert(), "Expert", parcours.getNiveauExpert()));

        return parcoursRepository.save(parcours);
    }

    @Transactional
    public ParcoursFormation update(Long id, ParcoursFormationDTO dto) {
        ParcoursFormation parcours = getById(id);
        parcours.setTitre(dto.getTitre());
        parcours.setCategorie(dto.getCategorie());
        parcours.setImageUrl(dto.getImageUrl());
        parcours.setDescription(dto.getDescription());

        if (dto.getNiveauDebutantId() != null) {
            parcours.setNiveauDebutant(formationRepository.findById(dto.getNiveauDebutantId()).orElse(null));
        }
        if (dto.getNiveauIntermediaireId() != null) {
            parcours.setNiveauIntermediaire(formationRepository.findById(dto.getNiveauIntermediaireId()).orElse(null));
        }
        if (dto.getNiveauAvanceId() != null) {
            parcours.setNiveauAvance(formationRepository.findById(dto.getNiveauAvanceId()).orElse(null));
        }
        if (dto.getNiveauExpertId() != null) {
            parcours.setNiveauExpert(formationRepository.findById(dto.getNiveauExpertId()).orElse(null));
        }

        return parcoursRepository.save(parcours);
    }

    @Transactional
    public void delete(Long id) {
        ParcoursFormation parcours = getById(id);
        // Supprimer les inscriptions liées pour éviter les erreurs de contrainte (FK)
        inscriptionRepository.deleteByParcoursId(id);
        parcoursRepository.delete(parcours);
    }

    @Transactional
    public ParcoursFormation archiver(Long id) {
        ParcoursFormation parcours = getById(id);
        parcours.setStatut("Archivée");
        
        // Archiver aussi les formations liées
        archiveFormation(parcours.getNiveauDebutant());
        archiveFormation(parcours.getNiveauIntermediaire());
        archiveFormation(parcours.getNiveauAvance());
        archiveFormation(parcours.getNiveauExpert());
        
        return parcoursRepository.save(parcours);
    }

    @Transactional
    public ParcoursFormation desarchiver(Long id) {
        ParcoursFormation parcours = getById(id);
        parcours.setStatut("Disponible");
        
        // Désarchiver aussi les formations liées
        desarchiveFormation(parcours.getNiveauDebutant());
        desarchiveFormation(parcours.getNiveauIntermediaire());
        desarchiveFormation(parcours.getNiveauAvance());
        desarchiveFormation(parcours.getNiveauExpert());
        
        return parcoursRepository.save(parcours);
    }

    private void archiveFormation(Formation f) {
        if (f != null) {
            f.setStatut("Archivée");
            formationRepository.save(f);
        }
    }

    private void desarchiveFormation(Formation f) {
        if (f != null) {
            f.setStatut("Disponible");
            formationRepository.save(f);
        }
    }

    private Formation createFormationFromDTO(FormationDTO dto, String niveau) {
        if (dto == null) {
            throw new RuntimeException("La formation de niveau " + niveau + " est requise");
        }
        Formation formation = new Formation();
        BeanUtils.copyProperties(dto, formation, "id");
        formation.setNiveau(niveau);
        if (formation.getStatut() == null) formation.setStatut("Disponible");
        if (formation.getPlateforme() == null || formation.getPlateforme().isBlank()) {
            formation.setPlateforme("YouTube");
        }
        return formationRepository.save(formation);
    }

    private Formation updateOrCreateFormation(FormationDTO dto, String niveau, Formation existing) {
        if (dto == null) return existing;
        Formation formation = (existing != null) ? existing : new Formation();
        
        // On copie les propriétés du DTO vers l'entité, en ignorant l'ID car l'entité a déjà le sien (ou est nouvelle)
        BeanUtils.copyProperties(dto, formation, "id");
        formation.setNiveau(niveau);
        
        if (formation.getStatut() == null) formation.setStatut("Disponible");
        if (formation.getPlateforme() == null || formation.getPlateforme().isBlank()) {
            formation.setPlateforme("YouTube");
        }
        
        return formationRepository.save(formation);
    }

    @Transactional
    public void refreshGlobalStats() {
        parcoursRepository.refreshAllGlobalStats();
    }
}
