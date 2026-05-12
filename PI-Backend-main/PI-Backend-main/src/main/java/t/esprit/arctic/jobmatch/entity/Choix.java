package t.esprit.arctic.jobmatch.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "choix")
public class Choix {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String texte;

    @Column(nullable = false)
    private boolean correcte;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(nullable = false)
    private int ordre;

    // Getters explicites
    public Long getId() {
        return id;
    }

    public String getTexte() {
        return texte;
    }

    public boolean isCorrecte() {
        return correcte;
    }

    public Question getQuestion() {
        return question;
    }

    public int getOrdre() {
        return ordre;
    }

    // Setters explicites
    public void setQuestion(Question question) {
        this.question = question;
    }
}