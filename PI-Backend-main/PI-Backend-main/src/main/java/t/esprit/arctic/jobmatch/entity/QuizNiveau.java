package t.esprit.arctic.jobmatch.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;

@Entity
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class QuizNiveau {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inscription_parcours_id", nullable = false)
    @JsonIgnore
    private InscriptionParcours inscriptionParcours;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NiveauOrdre niveau;

    /** JSON des questions+réponses générées par Groq */
    @Column(columnDefinition = "TEXT")
    private String questionsJson;

    /** JSON des réponses soumises par le candidat */
    @Column(columnDefinition = "TEXT")
    private String reponsesCandidat;

    /** Score sur 100 */
    private int score;

    /** true si score >= seuil du niveau */
    private boolean reussi;

    /** Numéro de tentative (1, 2, 3…) */
    private int tentative;

    private LocalDateTime dateTentative;
}
