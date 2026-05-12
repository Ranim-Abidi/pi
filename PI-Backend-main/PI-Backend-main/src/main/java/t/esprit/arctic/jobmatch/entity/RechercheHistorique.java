package t.esprit.arctic.jobmatch.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RechercheHistorique {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Le terme exact tapé par le candidat
    private String terme;

    // Date et heure de la recherche — pour trier les plus récentes
    private LocalDateTime dateRecherche;

    // Lien vers le candidat qui a effectué cette recherche
    @ManyToOne
    @JoinColumn(name = "candidat_id")
    private Candidat candidat;
}