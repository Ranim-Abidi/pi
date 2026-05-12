package t.esprit.arctic.jobmatch.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Competence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Le nom de la compétence est requis")
    @Size(min = 2, max = 100, message = "Le nom doit contenir entre 2 et 100 caractères")
    private String nom;

    @NotBlank(message = "Le niveau est requis")
    @Pattern(regexp = "(Débutant|Intermédiaire|Avancé|Expert)", message = "Le niveau doit être: Débutant, Intermédiaire, Avancé ou Expert")
    private String niveau;

    @NotBlank(message = "Le type est requis")
    @Size(min = 2, max = 50, message = "Le type doit contenir entre 2 et 50 caractères")
    private String type;
}

