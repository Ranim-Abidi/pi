package t.esprit.arctic.jobmatch.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;
    private String prenom;
    private String titre;
    private String email;
    private String telephone;
    private String adresse;

    @Column(columnDefinition = "TEXT")
    private String profil;

    @Column(columnDefinition = "TEXT")
    private String competences;

    @Column(columnDefinition = "TEXT")
    private String langues;

    @Column(name = "centres_interet", columnDefinition = "TEXT")
    private String centresInteret;

    @Column(columnDefinition = "TEXT")
    private String experiences;

    @Column(columnDefinition = "TEXT")
    private String formations;

    @Column(name = "photo_name")
    private String photoName;

    @Column(name = "photo_data", columnDefinition = "LONGTEXT")
    private String photoData;

    @Enumerated(EnumType.STRING)
    private TypeDocument type;

    @Column(columnDefinition = "LONGTEXT")
    private String contenu;

    private String template;

    @Column(name = "compatibleats")
    private Boolean compatibleATS;

    @Column(name = "ajouter_photo")
    private Boolean ajouterPhoto = false;

    @Column(name = "date_creation")
    private LocalDateTime dateCreation;

    @Column(name = "archive", nullable = false)
    private Boolean archive = false;

    @PrePersist
    protected void onCreate() {
        dateCreation = LocalDateTime.now();
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (scoreATS == null) scoreATS = 0;
        if (archive == null) archive = false;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "score_ats")
    private Integer scoreATS = 0;

    @Column(name = "nom_fichier")
    private String nomFichier;


    @JsonIgnore
    @OneToOne(mappedBy = "document")
    private Candidature candidature;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "candidat_id")
    private Candidat candidat;
}