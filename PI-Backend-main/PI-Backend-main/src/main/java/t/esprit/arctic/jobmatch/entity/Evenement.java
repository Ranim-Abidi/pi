package t.esprit.arctic.jobmatch.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Evenement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Le titre est obligatoire")
    @Size(min = 3, max = 100, message = "Le titre doit contenir entre 3 et 100 caractères")
    private String titre;

    @NotNull(message = "La date et l'heure sont obligatoires")
    private LocalDateTime dateHeure;

    @NotBlank(message = "Le lieu est obligatoire")
    @Size(min = 2, message = "Le lieu doit contenir au moins 2 caractères")
    private String lieu;

    @NotBlank(message = "Le type est obligatoire")
    @Pattern(
            regexp = "JOB_FAIR|WORKSHOP|CONFERENCE|NETWORKING",
            message = "Type invalide : JOB_FAIR, WORKSHOP, CONFERENCE ou NETWORKING"
    )
    private String type;

    @Builder.Default
    private boolean chatOuvert = false;

    // Relation OneToMany avec Participation
    @OneToMany(mappedBy = "evenement", cascade = CascadeType.ALL)
    private List<Participation> participations;

    // Relation avec OrganisateurEvenement
    @ManyToOne
    @JoinColumn(name = "organisateur_id")
    private OrganisateurEvenement organisateur;
}