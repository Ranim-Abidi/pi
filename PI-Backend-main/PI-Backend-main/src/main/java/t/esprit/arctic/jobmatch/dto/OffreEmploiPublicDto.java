package t.esprit.arctic.jobmatch.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import t.esprit.arctic.jobmatch.entity.OffreEmploi;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * Projection JSON pour les listes publiques : pas de relations lazy, compatible open-in-view=false.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OffreEmploiPublicDto {

    private Long id;
    private String titre;
    private String description;
    private String entreprise;
    private String location;
    private String salary;
    private String typeContrat;
    private String statut;
    private Date datePublication;
    /** Champ persistant (nom Java / JSON classique). */
    private Date deadline;
    /** Alias attendu par le front (home-demo-one). */
    private Date dateLimite;
    private List<String> competencesRequises;
    private String image;

    public static OffreEmploiPublicDto fromEntity(OffreEmploi o) {
        if (o == null) {
            return null;
        }
        OffreEmploiPublicDto d = new OffreEmploiPublicDto();
        d.setId(o.getId());
        d.setTitre(o.getTitre());
        d.setDescription(o.getDescription());
        d.setEntreprise(o.getEntreprise());
        d.setLocation(o.getLocation());
        d.setSalary(o.getSalary());
        d.setTypeContrat(o.getTypeContrat());
        d.setStatut(o.getStatut());
        d.setDatePublication(o.getDatePublication());
        d.setDeadline(o.getDeadline());
        d.setDateLimite(o.getDeadline());
        // Copie impérative : ne pas exposer la PersistentBag Hibernate au Jackson hors session (OIV=false).
        List<String> comp = o.getCompetencesRequises();
        if (comp == null || comp.isEmpty()) {
            d.setCompetencesRequises(List.of());
        } else {
            d.setCompetencesRequises(new ArrayList<>(comp));
        }
        d.setImage(o.getImage());
        return d;
    }
}
