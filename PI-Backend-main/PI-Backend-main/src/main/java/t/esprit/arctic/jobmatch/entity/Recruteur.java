package t.esprit.arctic.jobmatch.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@DiscriminatorValue("RECRUTEUR")
public class Recruteur extends Utilisateur {

    private String entreprise;
    private String poste;
    private String secteur;

    @OneToMany(mappedBy = "recruteur", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Entretien> entretiens;

    @JsonIgnore
    @OneToMany(mappedBy = "recruteur", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OffreEmploi> offresEmploi;

    // Setters explicites pour Lombok
    public void setEntreprise(String entreprise) {
        this.entreprise = entreprise;
    }

    public void setPoste(String poste) {
        this.poste = poste;
    }

    public void setSecteur(String secteur) {
        this.secteur = secteur;
    }
}
