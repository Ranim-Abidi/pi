package t.esprit.arctic.jobmatch.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "entretiens")
public class Entretien {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime dateEntretien;

    @Column(length = 255)
    private String titre;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "VARCHAR(32)")
    private CategorieEntretien categorie;

    @Column(name = "mode", length = 32)
    private String mode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = true, columnDefinition = "VARCHAR(64)")
    private DomaineType domaine;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidat_id", nullable = true)
    private Candidat candidat;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "offre_id", nullable = true)
    private OffreEmploi offreEmploi;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recruteur_id", nullable = false)
    private Recruteur recruteur;

    @OneToMany(mappedBy = "entretien", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Question> questions;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 500, nullable = true)
    private String photo;

    @Column(name = "meeting_link", length = 500, nullable = true)
    private String meetingLink;

    private boolean completed = false;

    /** Pour les entretiens de type TEST le seuil de reussite est null  */
    @Column(nullable = true)
    private Integer seuilReussite;

    @Column(name = "duree_minutes", nullable = true)
    private Integer dureeMinutes;

    @Column(nullable = true)
    private Double score;

    @Column(nullable = true)
    private Integer totalQuestions;

    @Column(nullable = true)
    private Integer bonnesReponses;

    @Column(nullable = true)
    private String decision;

    @Column(columnDefinition = "TEXT")
    private String commentaire;

    @Column(name = "evaluated_at")
    private LocalDateTime evaluatedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Getters
    public Long getId() {
        return id;
    }

    public LocalDateTime getDateEntretien() {
        return dateEntretien;
    }

    public String getTitre() {
        return titre;
    }

    public CategorieEntretien getCategorie() {
        return categorie;
    }

    public DomaineType getDomaine() {
        return domaine;
    }

    public Candidat getCandidat() {
        return candidat;
    }

    public OffreEmploi getOffreEmploi() {
        return offreEmploi;
    }

    public Recruteur getRecruteur() {
        return recruteur;
    }

    public List<Question> getQuestions() {
        return questions;
    }

    public String getDescription() {
        return description;
    }

    public String getPhoto() {
        return photo;
    }

    public boolean isCompleted() {
        return completed;
    }

    public Integer getSeuilReussite() {
        return seuilReussite;
    }

    public Integer getDureeMinutes() {
        return dureeMinutes;
    }

    public Double getScore() {
        return score;
    }

    public Integer getTotalQuestions() {
        return totalQuestions;
    }

    public Integer getBonnesReponses() {
        return bonnesReponses;
    }

    public String getDecision() {
        return decision;
    }

    public String getCommentaire() {
        return commentaire;
    }

    public LocalDateTime getEvaluatedAt() {
        return evaluatedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    // Setters explicites
    public void setTitre(String titre) {
        this.titre = titre;
    }

    public void setDomaine(DomaineType domaine) {
        this.domaine = domaine;
    }

    public void setCandidat(Candidat candidat) {
        this.candidat = candidat;
    }

    public void setOffreEmploi(OffreEmploi offreEmploi) {
        this.offreEmploi = offreEmploi;
    }

    public void setRecruteur(Recruteur recruteur) {
        this.recruteur = recruteur;
    }

    public void setPhoto(String photo) {
        this.photo = photo;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }

    public void setSeuilReussite(Integer seuilReussite) {
        this.seuilReussite = seuilReussite;
    }

    public void setDureeMinutes(Integer dureeMinutes) {
        this.dureeMinutes = dureeMinutes;
    }

    public void setScore(Double score) {
        this.score = score;
    }

    public void setTotalQuestions(Integer totalQuestions) {
        this.totalQuestions = totalQuestions;
    }

    public void setBonnesReponses(Integer bonnesReponses) {
        this.bonnesReponses = bonnesReponses;
    }

    public void setDecision(String decision) {
        this.decision = decision;
    }

    public void setCommentaire(String commentaire) {
        this.commentaire = commentaire;
    }

    public void setEvaluatedAt(LocalDateTime evaluatedAt) {
        this.evaluatedAt = evaluatedAt;
    }
}
