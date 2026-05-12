package t.esprit.arctic.jobmatch.entity;

import jakarta.persistence.*;
        import lombok.*;
        import java.time.LocalDateTime;

@Entity
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class VideoProgression {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long inscriptionId;

    @Column(nullable = false)
    private Long candidatId;

    @Column(nullable = false)
    private Long formationId;

    @Column(nullable = false)
    private String videoId;

    private boolean vuComplete;
    private boolean quizReussi;

    private LocalDateTime dateVue;
    private LocalDateTime dateQuiz;

    private int scoreQuiz;
}