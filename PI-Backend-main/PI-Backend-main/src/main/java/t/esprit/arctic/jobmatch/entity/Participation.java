package t.esprit.arctic.jobmatch.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.Date;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Participation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Temporal(TemporalType.DATE)
    private Date dateInscription;

    private String statut;
    @Column(columnDefinition = "TEXT")
    private String qrCode;

    @Column(name = "certificate_url")
    private String certificateUrl;

    @Builder.Default
    @Column(name = "certificate_generated")
    private Boolean certificateGenerated = false;

    @ManyToOne
    @JoinColumn(name = "evenement_id")
    private Evenement evenement;

    @ManyToOne
    @JoinColumn(name = "candidat_id")
    private Candidat candidat;

    @OneToMany(mappedBy = "participation", cascade = CascadeType.ALL)
    private List<Feedback> feedbacks;
}