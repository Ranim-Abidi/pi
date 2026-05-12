package t.esprit.arctic.jobmatch.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.util.List;
import t.esprit.arctic.jobmatch.entity.Competence;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FormationDTO {

    private Long id;

    @NotBlank(message = "Le titre est requis")
    @Size(min = 3, max = 150)
    private String titre;

    @NotBlank(message = "La catégorie est requise")
    private String categorie;

    @NotBlank(message = "La plateforme est requise")
    private String plateforme;

    @NotBlank(message = "Le statut est requis")
    @Pattern(regexp = "(Disponible|Archivée|Bientôt)", message = "Statut invalide")
    private String statut;

    @NotBlank(message = "La durée est requise")
    private String duree;

    @NotBlank(message = "Le niveau est requis")
    @Pattern(regexp = "(Débutant|Intermédiaire|Avancé|Expert)", message = "Niveau invalide")
    private String niveau;

    @Size(max = 500, message = "Le lien externe ne peut pas dépasser 500 caractères")
    private String lienExterne;

    @Size(max = 100, message = "L'ID de la playlist ne peut pas dépasser 100 caractères")
    private String playlistId;

    @Size(max = 100, message = "L'URL Youtube ne peut pas dépasser 100 caractères")
    private String youtubeId;

    private Boolean hasEditor;

    @Size(max = 500, message = "L'URL StackBlitz ne peut pas dépasser 500 caractères")
    private String stackBlitzUrl;

    @Size(max = 500, message = "L'URL écrite ne peut pas dépasser 500 caractères")
    private String writtenUrl;

    @Size(max = 1000, message = "La description ne peut pas dépasser 1000 caractères")
    private String description;

    @Size(max = 500, message = "L'URL de l'image ne peut pas dépasser 500 caractères")
    private String imageUrl;

    private List<Competence> competences;
}
