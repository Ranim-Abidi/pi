package t.esprit.arctic.jobmatch.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class DocumentDTO {

    @NotBlank(message = "Le nom du fichier est obligatoire")
    private String nomFichier;

    @NotBlank(message = "Le nom est obligatoire")
    @Size(min = 2, max = 100, message = "Le nom doit contenir entre 2 et 100 caractères")
    @Pattern(regexp = "^[a-zA-ZÀ-ÿ\\s'-]+$",
            message = "Le nom ne doit contenir que des lettres, espaces, tirets ou apostrophes")
    private String nom;

    @NotBlank(message = "Le prénom est obligatoire")
    @Size(min = 2, max = 100, message = "Le prénom doit contenir entre 2 et 100 caractères")
    @Pattern(regexp = "^[a-zA-ZÀ-ÿ\\s'-]+$",
            message = "Le prénom ne doit contenir que des lettres, espaces, tirets ou apostrophes")
    private String prenom;

    private String titre;

    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "Format d'email invalide (ex: nom@domaine.com)")
    private String email;

    @Pattern(
            regexp = "^(\\+216[\\s]?)?[0-9]{2}[\\s]?[0-9]{3}[\\s]?[0-9]{3}$",
            message = "Format de téléphone invalide. Exemples: +216 55 555 555, 55555555"
    )
    private String telephone;

    private String adresse;

    @NotBlank(message = "Le profil est obligatoire")
    @Size(min = 20, max = 500, message = "Le profil doit contenir entre 20 et 500 caractères")
    private String profil;

    @NotBlank(message = "Les compétences sont obligatoires")
    private String competences;

    private String langues;
    private String centresInteret;

    @NotBlank(message = "Les expériences sont obligatoires")
    private String experiences;

    @NotBlank(message = "La formation est obligatoire")
    private String formations;

    private String photoName;
    private String photoData;
    private String type;
    private String contenu;
    private String template;
    private Boolean compatibleATS;
    private Boolean ajouterPhoto;
}