package t.esprit.arctic.jobmatch.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.validator.constraints.URL;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Candidat extends Utilisateur {

    @Size(min = 0, max = 100, message = "Le prénom doit contenir entre 0 et 100 caractères")
    private String prenom;

    @Pattern(regexp = "^[0-9+\\-\\s()]*$", message = "Le téléphone n'est pas valide")
    private String telephone;

    @Size(max = 1000, message = "La description ne doit pas dépasser 1000 caractères")
    @Column(columnDefinition = "TEXT")
    private String description;

    private String cv;

    @JsonProperty("cv_url")
    private String cvUrl;

    @JsonProperty("profile_picture_url")
    private String profilePictureUrl;

    @URL(message = "Le lien portfolio doit être une URL valide")
    private String lienPortfolio;

    private String niveauEtude;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "candidat_competence",
        joinColumns = @JoinColumn(name = "candidat_id"),
        inverseJoinColumns = @JoinColumn(name = "competence_id")
    )
    private List<Competence> competences;

    @ManyToOne
    @JoinColumn(name = "localisation_id")
    private Localisation localisation;

    @Transient
    @JsonProperty("localisation_id")
    private Long localisationId;

    @Column(columnDefinition = "LONGTEXT")
    private String backgroundExpertise;

    @Column(columnDefinition = "LONGTEXT")
    private String passionAndGoals;

    @OneToMany(mappedBy = "candidat", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Education> educations = new java.util.ArrayList<>();

    @OneToMany(mappedBy = "candidat", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Background> backgrounds = new java.util.ArrayList<>();

    @OneToMany(mappedBy = "candidat", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<InscriptionFormation> inscriptions = new java.util.ArrayList<>();

    // Un candidat peut postuler à 0..* emplois via la table de liaison Candidature
    @JsonIgnore
    @OneToMany(mappedBy = "candidat", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Candidature> candidatures = new java.util.ArrayList<>();

    // Recommendations linked to this candidate
    @JsonIgnore
    @OneToMany(mappedBy = "candidat", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CandidateRecommendation> candidateRecommendations = new java.util.ArrayList<>();

    public void setExperience(int i) {
    }

    /**
     * Custom getter for localisationId - returns ID from localisation if it exists
     */
    @com.fasterxml.jackson.annotation.JsonGetter("localisation_id")
    public Long getLocalisationId() {
        if (this.localisationId != null) {
            return this.localisationId;
        }
        if (this.localisation != null) {
            return this.localisation.getId();
        }
        return null;
    }

    /**
     * Custom setter for localisationId
     */
    @com.fasterxml.jackson.annotation.JsonSetter("localisation_id")
    public void setLocalisationId(Long localisationId) {
        this.localisationId = localisationId;
    }
}

