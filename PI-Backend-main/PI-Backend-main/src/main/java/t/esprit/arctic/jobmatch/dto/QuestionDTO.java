package t.esprit.arctic.jobmatch.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuestionDTO {
    private Long id;

    // Ajout du champ pour l'identifiant de l'entretien
    private Long entretienId;

    // Ajout du champ pour plusieurs bonnes réponses
    private List<String> bonneReponses;

    @NotBlank(message = "Le contenu de la question est obligatoire")
    @Size(min = 10, max = 1000, message = "Le contenu doit contenir entre 10 et 1000 caractères")
    private String contenu;

    @NotBlank(message = "Le type de question est obligatoire")
    @Pattern(regexp = "QCM|QCU|VRAI_FAUX",
             message = "Le type doit être : QCM, QCU ou VRAI_FAUX")
    private String type;

    @NotBlank(message = "Le niveau est obligatoire")
    @Pattern(regexp = "DEBUTANT|INTERMEDIAIRE|AVANCE|EXPERT",
             message = "Le niveau doit être : DEBUTANT, INTERMEDIAIRE, AVANCE ou EXPERT")
    private String niveau;

    private List<ChoixDTO> choix;

    @Min(value = 1, message = "L'ordre doit être supérieur à 0")
    private int ordre;

    private boolean actif = true;

    @Min(value = 1, message = "Les points doivent être au minimum 1")
    @Max(value = 100, message = "Les points ne peuvent pas dépasser 100")
    private int points = 1;

    // Ajout du champ pour la bonne réponse
    private String bonneReponse;

    // Getters explicites
    public Long getId() {
        return id;
    }

    public String getContenu() {
        return contenu;
    }

    public String getType() {
        return type;
    }

    public String getNiveau() {
        return niveau;
    }

    public List<ChoixDTO> getChoix() {
        return choix;
    }

    public int getOrdre() {
        return ordre;
    }

    public boolean isActif() {
        return actif;
    }

    public int getPoints() {
        return points;
    }
    public Long getEntretienId() {
        return entretienId;
    }
    public String getBonneReponse() {
        return bonneReponse;
    }

    public List<String> getBonneReponses() {
        return bonneReponses;
    }
}
