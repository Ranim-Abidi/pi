package t.esprit.arctic.jobmatch.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "questions")
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String contenu;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TypeQuestion type;

    @Column(nullable = false)
    private String niveau;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entretien_id", nullable = false)
    private Entretien entretien;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<Choix> choix;

    @Column(nullable = false)
    private int ordre;

    @Column(nullable = false)
    private boolean actif = true;

    @Column(nullable = false)
    private int points = 1;

    // Getters explicites
    public Long getId() {
        return id;
    }

    public String getContenu() {
        return contenu;
    }

    public TypeQuestion getType() {
        return type;
    }

    public String getNiveau() {
        return niveau;
    }

    public Entretien getEntretien() {
        return entretien;
    }

    public List<Choix> getChoix() {
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

    // Setters explicites
    public void setEntretien(Entretien entretien) {
        this.entretien = entretien;
    }

    public void setActif(boolean actif) {
        this.actif = actif;
    }

    public void setPoints(int points) {
        this.points = points;
    }
}