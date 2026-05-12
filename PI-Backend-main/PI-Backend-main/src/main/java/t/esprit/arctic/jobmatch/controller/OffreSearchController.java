package t.esprit.arctic.jobmatch.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.dto.OffreSearchDTO;
import t.esprit.arctic.jobmatch.service.OffreSearchService;

import java.util.List;

/**
 * Contrôleur REST pour la recherche avancée d'offres d'emploi
 * Expose des endpoints pour:
 * - Recherche simple par mots-clés
 * - Recherche avancée avec filtres multiples
 * - Recherche par entreprise
 * - Récupération des offres populaires
 */
@RestController
@RequestMapping("/api/offres-search")
@RequiredArgsConstructor
public class OffreSearchController {

    private final OffreSearchService offreSearchService;

    /**
     * Recherche simple par mots-clés
     * 
     * @param keyword Le mot-clé à rechercher
     * @return List des offres correspondantes
     * 
     * Exemple: GET /api/offres-search/keyword?q=Java
     */
    @GetMapping("/keyword")
    public ResponseEntity<List<OffreSearchDTO>> searchByKeyword(
            @RequestParam(value = "q", required = true) String keyword) {

        try {
            List<OffreSearchDTO> results = offreSearchService.searchByKeyword(keyword);
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .build();
        }
    }

    /**
     * Recherche avancée avec critères multiples (jointures complexes)
     * 
     * @param keyword Mot-clé optionnel
     * @param location Localisation optionnelle
     * @param minSalaire Salaire minimum optionnel
     * @param maxSalaire Salaire maximum optionnel
     * @param typeContrat Type de contrat optionnel
     * @return Offres correspondant à TOUS les critères
     * 
     * Exemple: GET /api/offres-search/advanced?q=Developer&location=Tunis&minSalaire=50&maxSalaire=100&typeContrat=CDI
     */
    @GetMapping("/advanced")
    public ResponseEntity<List<OffreSearchDTO>> advancedSearch(
            @RequestParam(value = "q", required = false) String keyword,
            @RequestParam(value = "location", required = false) String location,
            @RequestParam(value = "minSalaire", required = false) Integer minSalaire,
            @RequestParam(value = "maxSalaire", required = false) Integer maxSalaire,
            @RequestParam(value = "typeContrat", required = false) String typeContrat) {

        try {
            List<OffreSearchDTO> results = offreSearchService.advancedSearch(
                    keyword,
                    location,
                    minSalaire,
                    maxSalaire,
                    typeContrat
            );
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .build();
        }
    }

    /**
     * Recherche par nom d'entreprise avec mots-clés optionnels
     * Jointure INNER avec Recruteur, LEFT JOIN avec Candidatures
     * 
     * @param nomEntreprise Nom de l'entreprise (obligatoire)
     * @param keyword Mots-clés optionnels
     * @return Toutes les offres de l'entreprise
     * 
     * Exemple: GET /api/offres-search/company?company=TechCorp&q=Developer
     */
    @GetMapping("/company")
    public ResponseEntity<List<OffreSearchDTO>> searchByCompany(
            @RequestParam(value = "company", required = true) String nomEntreprise,
            @RequestParam(value = "q", required = false) String keyword) {

        try {
            List<OffreSearchDTO> results = offreSearchService.searchByCompany(nomEntreprise, keyword);
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .build();
        }
    }

    /**
     * Récupère les offres les plus populaires (classées par nombre de candidatures)
     * 
     * @param keyword Mot-clé optionnel pour filtrer
     * @param limit Nombre d'offres à retourner (défaut: 10)
     * @return Top offres les plus attractives
     * 
     * Exemple: GET /api/offres-search/popular?limit=5
     * Exemple: GET /api/offres-search/popular?q=Java&limit=10
     */
    @GetMapping("/popular")
    public ResponseEntity<List<OffreSearchDTO>> getPopularOffers(
            @RequestParam(value = "q", required = false) String keyword,
            @RequestParam(value = "limit", required = false, defaultValue = "10") Integer limit) {

        try {
            List<OffreSearchDTO> results = offreSearchService.getPopularOffers(keyword, limit);
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .build();
        }
    }

    /**
     * Health check pour l'API de recherche
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("API de recherche d'offres opérationnelle");
    }
}
