package t.esprit.arctic.jobmatch.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EntretienDTO {
    private Long id;

    @Size(max = 255, message = "Le titre ne peut pas depasser 255 caracteres")
    private String titre;

    @NotNull(message = "La date de l'entretien est obligatoire")
    @Future(message = "La date de l'entretien doit etre dans le futur")
    private LocalDateTime dateEntretien;

    @NotBlank(message = "Le type d'entretien est obligatoire")
    @Pattern(regexp = "TECHNIQUE|RH|MANAGERIAL|FINAL|PRESELECTION|TEST",
             message = "Le type doit etre : TECHNIQUE, RH, MANAGERIAL, FINAL, PRESELECTION ou TEST")
    private String type;

    @Pattern(regexp = "QUESTIONS|VIDEO", message = "Le mode doit etre QUESTIONS ou VIDEO")
    private String mode;

    private Long recruteurId;
    private Long candidatId;
    private Long offreId;
    private String offreTitre;

    @NotBlank(message = "La description est obligatoire")
    @Size(min = 10, max = 1000, message = "La description doit contenir entre 10 et 1000 caracteres")
    private String description;

    @Size(max = 500, message = "L'URL de la photo ne peut pas depasser 500 caracteres")
    private String photo;

    @Size(max = 500, message = "Le lien de reunion ne peut pas depasser 500 caracteres")
    private String meetingLink;

    @NotBlank(message = "Le domaine est obligatoire")
    @Pattern(regexp = "INFORMATIQUE|BUSINESS|SANTE|INGENIERIE|EDUCATION|DESIGN|COMMUNICATION|INDUSTRIE|COMMERCE|AUTRE",
             message = "Le domaine doit etre un des suivants : INFORMATIQUE, BUSINESS, SANTE, INGENIERIE, EDUCATION, DESIGN, COMMUNICATION, INDUSTRIE, COMMERCE, AUTRE")
    private String domaine;

    private boolean completed;

    @Min(value = 0, message = "Le seuil de reussite doit etre d'au moins 0%")
    @Max(value = 100, message = "Le seuil de reussite ne peut pas depasser 100%")
    private Integer seuilReussite;

    @Min(value = 1, message = "La duree doit etre d'au moins 1 minute")
    @Max(value = 300, message = "La duree ne peut pas depasser 300 minutes")
    private Integer dureeMinutes;

    @Pattern(regexp = "TECHNIQUE|RH|MANAGERIAL|FINAL|PRESELECTION|TEST",
             message = "La categorie doit etre : TECHNIQUE, RH, MANAGERIAL, FINAL, PRESELECTION ou TEST")
    private String categorie;

    private LocalDateTime createdAt;
    private List<QuestionDTO> questions;
    private Double score;
    private Integer totalQuestions;
    private Integer bonnesReponses;
    private String decision;
    private String commentaire;
    private LocalDateTime evaluatedAt;
}
