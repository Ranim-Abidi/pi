package t.esprit.arctic.jobmatch.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.util.Date;
import t.esprit.arctic.jobmatch.entity.Formation;
import t.esprit.arctic.jobmatch.entity.Candidat;
import t.esprit.arctic.jobmatch.entity.Participation;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedbackDTO {

    private Long id;

    @Min(value = 1, message = "La note doit être entre 1 et 5")
    @Max(value = 5, message = "La note doit être entre 1 et 5")
    @NotNull(message = "La note est requise")
    private Integer note;

    @NotBlank(message = "Le commentaire est requis")
    @Size(min = 5, max = 1000, message = "Le commentaire doit contenir entre 5 et 1000 caractères")
    private String commentaire;

    private Date dateCreation;
    private Date dateModification;
    private Date date;

    private Formation formation;
    private Candidat candidat;
    private Participation participation;
}
