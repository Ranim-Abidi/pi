package t.esprit.arctic.jobmatch.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Date;
import java.util.List;

@Entity
@Table(name = "offres_emploi")
public class OffreEmploi {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Le titre est obligatoire")
    @Size(min = 3, max = 120, message = "Le titre doit contenir entre 3 et 120 caracteres")
    private String titre;

    @Column(columnDefinition = "TEXT")
    @NotBlank(message = "La description est obligatoire")
    @Size(min = 20, max = 2000, message = "La description doit contenir entre 20 et 2000 caracteres")
    private String description;

    @NotBlank(message = "L'entreprise est obligatoire")
    @Size(min = 2, max = 100, message = "Le nom de l'entreprise doit contenir entre 2 et 100 caracteres")
    private String entreprise;

    @NotBlank(message = "La localisation est obligatoire")
    @Size(min = 2, max = 100, message = "La localisation doit contenir entre 2 et 100 caracteres")
    private String location;

    @NotBlank(message = "Le salaire est obligatoire")
    @Size(min = 1, max = 50, message = "Le salaire doit contenir entre 1 et 50 caracteres")
    private String salary;

    @NotBlank(message = "Le type de contrat est obligatoire")
    @Pattern(regexp = "^(CDI|CDD|STAGE|FREELANCE)$", message = "Type de contrat invalide")
    private String typeContrat;

    private String statut;

    @Column(name = "date_publication")
    private Date datePublication;

    @Column(name = "date_limite")
        @NotNull(message = "La date limite est obligatoire")
        @Future(message = "La date limite doit etre strictement future")
    private Date deadline;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "offre_competences", joinColumns = @JoinColumn(name = "offre_id"))
    @Column(name = "competence")
        @NotEmpty(message = "Au moins une competence est obligatoire")
        @Size(max = 15, message = "Le nombre maximum de competences est 15")
        private List<
            @NotBlank(message = "Chaque competence est obligatoire")
            @Size(min = 2, max = 40, message = "Chaque competence doit contenir entre 2 et 40 caracteres")
            String> competencesRequises;

        @Size(max = 500, message = "L'URL de l'image ne peut pas depasser 500 caracteres")
    private String image;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recruteur_id")
    private Recruteur recruteur;

    // Une offre peut recevoir 0..* candidatures
    @JsonIgnore
    @OneToMany(mappedBy = "offreEmploi", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Candidature> candidatures;

    // Recommendations linked to this job offer
    @JsonIgnore
    @OneToMany(mappedBy = "offre", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CandidateRecommendation> candidateRecommendations;

    // les constructeurs
    public OffreEmploi() {}

    public OffreEmploi(String titre, String description, String entreprise, String location) {
        this.titre = titre;
        this.description = description;
        this.entreprise = entreprise;
        this.location = location;
        this.datePublication = new Date();
        this.statut = "ACTIVE";
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitre() {
        return titre;
    }

    public void setTitre(String titre) {
        this.titre = titre;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getEntreprise() {
        return entreprise;
    }

    public void setEntreprise(String entreprise) {
        this.entreprise = entreprise;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getSalary() {
        return salary;
    }

    public void setSalary(String salary) {
        this.salary = salary;
    }

    public String getTypeContrat() {
        return typeContrat;
    }

    public void setTypeContrat(String typeContrat) {
        this.typeContrat = typeContrat;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public Date getDatePublication() {
        return datePublication;
    }

    public void setDatePublication(Date datePublication) {
        this.datePublication = datePublication;
    }

    public Date getDeadline() {
        return deadline;
    }

    public void setDeadline(Date deadline) {
        this.deadline = deadline;
    }

    public List<String> getCompetencesRequises() {
        return competencesRequises;
    }

    public void setCompetencesRequises(List<String> competencesRequises) {
        this.competencesRequises = competencesRequises;
    }

    public String getImage() {
        return image;
    }

    public void setImage(String image) {
        this.image = image;
    }

    /** Ignoré au JSON pour éviter LazyInitializationException hors session (liste publique des offres). */
    @JsonIgnore
    public Recruteur getRecruteur() {
        return recruteur;
    }

    public void setRecruteur(Recruteur recruteur) {
        this.recruteur = recruteur;
    }

    @JsonIgnore
    public List<Candidature> getCandidatures() {
        return candidatures;
    }

    public void setCandidatures(List<Candidature> candidatures) {
        this.candidatures = candidatures;
    }
}