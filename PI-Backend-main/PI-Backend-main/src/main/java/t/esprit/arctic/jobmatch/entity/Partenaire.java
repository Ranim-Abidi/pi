package t.esprit.arctic.jobmatch.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Partenaire {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;
    private String email;
    private String telephone;


    @ManyToOne
    @JoinColumn(name = "utilisateur_id")
    private Utilisateur utilisateur;
    
    @Enumerated(EnumType.STRING)
    private TypePartenaire type;

    @OneToMany(mappedBy = "partenaire")
    @JsonIgnore
    private List<OffrePartenaire> offres;

    @Column(name = "nombre_vues", columnDefinition = "int default 0")
    private int nombreVues = 0;

    @Column(name = "score_popularite", columnDefinition = "double default 0.0")
    private double scorePopularite = 0.0;

    @Column(name = "statut_activite")
    private String statutActivite = "ACTIF";
}