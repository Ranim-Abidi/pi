package t.esprit.arctic.jobmatch.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Localisation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Le pays est requis")
    @Size(min = 2, max = 100, message = "Le pays doit contenir entre 2 et 100 caractères")
    private String pays;

    @NotBlank(message = "La ville est requise")
    @Size(min = 2, max = 100, message = "La ville doit contenir entre 2 et 100 caractères")
    private String ville;

    @NotNull(message = "La longitude est requise")
    @DecimalMin(value = "-180.0", message = "La longitude doit être entre -180 et 180")
    @DecimalMax(value = "180.0", message = "La longitude doit être entre -180 et 180")
    private Double longitude;

    @NotNull(message = "La latitude est requise")
    @DecimalMin(value = "-90.0", message = "La latitude doit être entre -90 et 90")
    @DecimalMax(value = "90.0", message = "La latitude doit être entre -90 et 90")
    private Double latitude;
}

