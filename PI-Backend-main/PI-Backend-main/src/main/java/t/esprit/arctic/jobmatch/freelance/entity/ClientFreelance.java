package t.esprit.arctic.jobmatch.freelance.entity;

import jakarta.persistence.*;
import lombok.*;
import t.esprit.arctic.jobmatch.entity.Utilisateur;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@PrimaryKeyJoinColumn(name = "id")   // Required for JOINED inheritance
public class ClientFreelance extends Utilisateur {

    private String entreprise;

    private Double budget;

    // You can add more fields later if needed (e.g. secteur, description, etc.)
}