package t.esprit.arctic.jobmatch.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Getter
@Setter

@AllArgsConstructor
public class OrganisateurEvenement extends Utilisateur {

    private String organisation;
    private String adresse;
    private String descriptionProjet;


    @OneToMany(mappedBy = "organisateur", cascade = CascadeType.ALL)
    private List<Evenement> evenements;


    public OrganisateurEvenement() {
        this.setRole(Role.ORGANISATEUR);
    }
}
