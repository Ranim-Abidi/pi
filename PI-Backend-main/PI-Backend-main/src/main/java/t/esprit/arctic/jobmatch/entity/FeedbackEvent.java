package t.esprit.arctic.jobmatch.entity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import t.esprit.arctic.jobmatch.entity.Participation;

import java.time.LocalDate;
import java.util.Date;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedbackEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String commentaire;
    private int note;

    @Temporal(TemporalType.DATE)
    private LocalDate date;


    @ManyToOne
    @JoinColumn(name = "participation_id")
    private Participation participation;
}