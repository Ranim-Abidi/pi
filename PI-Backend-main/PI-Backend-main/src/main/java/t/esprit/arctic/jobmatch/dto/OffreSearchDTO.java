package t.esprit.arctic.jobmatch.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO pour la recherche avancée d'offres d'emploi
 * Contient les résultats avec un score de pertinence
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OffreSearchDTO {

        /**
         * Constructeur utilisé par la requête JPQL dans OffreSearchRepository
         * Signature exacte requise par Hibernate :
         * (Long, String, String, String, String, String, String, String, String, java.sql.Timestamp, Long, Long, Double, String, String)
         */
        public OffreSearchDTO(Long offreId, String titrOffre, String description, String entreprise, String recruteurNom, String recruteurEmail, String location, String typeContrat, String salaire, java.sql.Timestamp datePublication, Long nombreCandidatures, Long nombreCandidaturesAcceptees, Double relevanceScore, String matchedFields, String highlightedText) {
            this.offreId = offreId;
            this.titrOffre = titrOffre;
            this.description = description;
            this.entreprise = entreprise;
            this.recruteurNom = recruteurNom;
            this.recruteurEmail = recruteurEmail;
            this.location = location;
            this.typeContrat = typeContrat;
            this.salaire = salaire;
            this.datePublication = datePublication != null ? datePublication.toLocalDateTime() : null;
            this.nombreCandidatures = nombreCandidatures != null ? nombreCandidatures.intValue() : 0;
            this.nombreCandidaturesAcceptees = nombreCandidaturesAcceptees != null ? nombreCandidaturesAcceptees.intValue() : 0;
            this.relevanceScore = relevanceScore;
            this.matchedFields = matchedFields;
            this.highlightedText = highlightedText;
        }
    
    private Long offreId;
    private String titrOffre;
    private String description;
    private String entreprise;
    private String recruteurNom;
    private String recruteurEmail;
    private String location;
    private String typeContrat;
    private String salaire;
    private LocalDateTime datePublication;
    private Integer nombreCandidatures;
    private Integer nombreCandidaturesAcceptees;
    
    // Score de pertinence pour le classement des résultats (0-100)
    private Double relevanceScore;
    
    // Champs de recherche utilisés pour le surlignage du résultat
    private String matchedFields; // Ex: "titre, description, compétences"
    private String highlightedText; // Extrait du texte avec les mots-clés mis en avant

}
