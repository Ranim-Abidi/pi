package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import t.esprit.arctic.jobmatch.dto.OffreSearchDTO;
import t.esprit.arctic.jobmatch.repository.OffreSearchRepository;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
@Slf4j
public class OffreSearchService {

    private final OffreSearchRepository offreSearchRepository;

    /**
     * Recherche simple par mots-clés dans plusieurs champs
     * Implique les jointures: Recruteur, Candidatures
     * 
     * @param keyword Mot-clé de recherche
     * @return Liste des offres triées par pertinence
     */
    public List<OffreSearchDTO> searchByKeyword(String keyword) {
        try {
            if (keyword == null || keyword.trim().isEmpty()) {
                log.warn("Keyword vide pour la recherche");
                return new ArrayList<>();
            }

            log.info("Recherche par mot-clé: {}", keyword);
            long startTime = System.currentTimeMillis();

            // Requête JPQL avec jointures: OffreEmploi -> Recruteur, Candidatures
            List<OffreSearchDTO> results = offreSearchRepository.searchByKeyword(keyword.trim());

            // Enrichissement des résultats avec le score de pertinence
            results = enrichSearchResults(results, keyword);

            long duration = System.currentTimeMillis() - startTime;
            log.info("Recherche complétée en {}ms. {} résultats trouvés.", duration, results.size());

            return results;
        } catch (Exception e) {
            log.error("Erreur lors de la recherche par mot-clé: {}", keyword, e);
            throw new RuntimeException("Erreur lors de la recherche par mot-clé", e);
        }
    }

    /**
     * Recherche avancée avec critères multiples
     * Implique les jointures: Recruteur, Candidatures avec filtres avancés
     * 
     * @param keyword Mot-clé optionnel
     * @param location Localisation optionnelle
     * @param minSalaire Salaire minimum optionnel
     * @param maxSalaire Salaire maximum optionnel
     * @param typeContrat Type de contrat optionnel
     * @return Offres correspondant à tous les critères
     */
    public List<OffreSearchDTO> advancedSearch(
            String keyword,
            String location,
            Integer minSalaire,
            Integer maxSalaire,
            String typeContrat) {

        try {
            log.info("Recherche avancée - Keyword: {}, Location: {}, Salaire: {}-{}, Type: {}",
                    keyword, location, minSalaire, maxSalaire, typeContrat);

            long startTime = System.currentTimeMillis();

            // Requête JPQL complexe avec jointures et filtres multiples
            List<OffreSearchDTO> results = offreSearchRepository.searchWithFilters(
                    keyword != null ? keyword.trim() : null,
                    location,
                    minSalaire,
                    maxSalaire,
                    typeContrat
            );

            // Post-traitement et enrichissement
            results = enrichSearchResults(results, keyword);

            // Tri par relevance score
            results.sort(Comparator.comparingDouble(OffreSearchDTO::getRelevanceScore)
                    .reversed()
                    .thenComparing(OffreSearchDTO::getDatePublication)
                    .reversed());

            long duration = System.currentTimeMillis() - startTime;
            log.info("Recherche avancée complétée en {}ms. {} résultats.", duration, results.size());

            return results;
        } catch (Exception e) {
            log.error("Erreur lors de la recherche avancée", e);
            throw new RuntimeException("Erreur lors de la recherche avancée", e);
        }
    }

    /**
     * Recherche par nom d'entreprise avec mots-clés optionnels
     * Jointures: Recruteur (INNER), Candidatures (LEFT)
     * 
     * @param nomEntreprise Nom de l'entreprise
     * @param keyword Mot-clé optionnel dans les offres
     * @return Toutes les offres de l'entreprise
     */
    public List<OffreSearchDTO> searchByCompany(String nomEntreprise, String keyword) {
        try {
            if (nomEntreprise == null || nomEntreprise.trim().isEmpty()) {
                log.warn("Nom d'entreprise vide");
                return new ArrayList<>();
            }

            log.info("Recherche par entreprise: {}, Keyword: {}", nomEntreprise, keyword);

            List<OffreSearchDTO> results = offreSearchRepository.searchByCompanyName(
                    nomEntreprise,
                    keyword != null ? keyword.trim() : null
            );

            log.info("Trouvé {} offres pour l'entreprise: {}", results.size(), nomEntreprise);
            return results;
        } catch (Exception e) {
            log.error("Erreur lors de la recherche par entreprise: {}", nomEntreprise, e);
            throw new RuntimeException("Erreur lors de la recherche par entreprise", e);
        }
    }

    /**
     * Récupère les offres les plus populaires (avec plus de candidatures)
     * 
     * @param keyword Mot-clé optionnel
     * @param limit Nombre d'offres à retourner
     * @return Top offres les plus attractives
     */
    public List<OffreSearchDTO> getPopularOffers(String keyword, Integer limit) {
        try {
            log.info("Récupération des offres populaires - Keyword: {}, Limit: {}", keyword, limit);

            List<OffreSearchDTO> results = offreSearchRepository.findPopularOffres(
                    keyword != null ? keyword.trim() : null
            );

            // Limiter les résultats
            if (limit != null && limit > 0) {
                results = results.stream()
                        .limit(limit)
                        .collect(Collectors.toList());
            }

            log.info("{} offres populaires retournées", results.size());
            return results;
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des offres populaires", e);
            throw new RuntimeException("Erreur lors de la récupération des offres populaires", e);
        }
    }

    /**
     * Enrichit les résultats de recherche avec:
     * - Score de pertinence amélioré
     * - Champs correspondants mis en évidence
     * - Texte d'aperçu surligné
     * 
     * @param results Résultats bruts de la recherche
     * @param keyword Mot-clé utilisé pour la recherche
     * @return Résultats enrichis et triés
     */
    private List<OffreSearchDTO> enrichSearchResults(List<OffreSearchDTO> results, String keyword) {
        if (keyword == null || keyword.isEmpty()) {
            return results;
        }

        String keywordLower = keyword.toLowerCase();

        return results.stream()
                .map(result -> enrichSingleResult(result, keywordLower))
                .sorted(Comparator.comparingDouble(OffreSearchDTO::getRelevanceScore).reversed())
                .collect(Collectors.toList());
    }

    /**
     * Enrichit un seul résultat avec le score de pertinence détaillé
     * 
     * @param result Le résultat à enrichir
     * @param keywordLower Mot-clé en minuscules
     * @return Résultat enrichi
     */
    private OffreSearchDTO enrichSingleResult(OffreSearchDTO result, String keywordLower) {
        double relevanceScore = calculateRelevanceScore(result, keywordLower);
        result.setRelevanceScore(relevanceScore);

        // Déterminer les champs correspondants
        List<String> matchedFields = new ArrayList<>();
        if (result.getTitrOffre() != null && result.getTitrOffre().toLowerCase().contains(keywordLower)) {
            matchedFields.add("Titre");
        }
        if (result.getDescription() != null && result.getDescription().toLowerCase().contains(keywordLower)) {
            matchedFields.add("Description");
        }
        if (result.getEntreprise() != null && result.getEntreprise().toLowerCase().contains(keywordLower)) {
            matchedFields.add("Entreprise");
        }
        if (result.getLocation() != null && result.getLocation().toLowerCase().contains(keywordLower)) {
            matchedFields.add("Localisation");
        }

        result.setMatchedFields(String.join(", ", matchedFields));

        // Créer un aperçu surligné
        String highlighted = createHighlightedPreview(result.getDescription(), keywordLower);
        result.setHighlightedText(highlighted);

        return result;
    }

    /**
     * Calcule un score de pertinence en fonction:
     * - De la correspondance dans le titre (40 points)
     * - De la correspondance dans la description (25 points)
     * - De la correspondance dans l'entreprise (20 points)
     * - Du nombre de candidatures (5 points bonus)
     * 
     * @param result Résultat de recherche
     * @param keyword Mot-clé recherché
     * @return Score entre 0 et 100
     */
    private double calculateRelevanceScore(OffreSearchDTO result, String keyword) {
        double score = 0;

        // Points pour titre (correspondance exacte = 40)
        if (result.getTitrOffre() != null && result.getTitrOffre().toLowerCase().contains(keyword)) {
            score += 40;
        }

        // Points pour description (correspondance = 25)
        if (result.getDescription() != null && result.getDescription().toLowerCase().contains(keyword)) {
            score += 25;
        }

        // Points pour entreprise (correspondance = 20)
        if (result.getEntreprise() != null && result.getEntreprise().toLowerCase().contains(keyword)) {
            score += 20;
        }

        // Points bonus pour nombre de candidatures (jusqu'à 15 points)
        if (result.getNombreCandidatures() != null && result.getNombreCandidatures() > 0) {
            score += Math.min(result.getNombreCandidatures() * 2, 15);
        }

        // Points bonus pour taux d'acceptation
        if (result.getNombreCandidatures() != null && result.getNombreCandidatures() > 0) {
            int acceptanceRate = (result.getNombreCandidaturesAcceptees() * 100) 
                    / result.getNombreCandidatures();
            if (acceptanceRate > 50) {
                score += 5;
            }
        }

        return Math.min(score, 100); // Plafonner à 100
    }

    /**
     * Crée un aperçu de texte surligné avec le mot-clé en majuscules
     * 
     * @param text Texte original
     * @param keyword Mot-clé à surligner
     * @return Aperçu du texte avec surligné
     */
    private String createHighlightedPreview(String text, String keyword) {
        if (text == null || text.isEmpty()) {
            return "";
        }

        // Trouver la position du mot-clé
        int index = text.toLowerCase().indexOf(keyword);
        if (index == -1) {
            return text.substring(0, Math.min(100, text.length())) + "...";
        }

        // Créer un aperçu autour du mot-clé (50 caractères avant et après)
        int start = Math.max(0, index - 50);
        int end = Math.min(text.length(), index + keyword.length() + 50);

        String preview = text.substring(start, end);
        // Surligner le mot-clé en majuscules
        String highlighted = preview.replaceAll(
                "(?i)" + Pattern.quote(keyword),
                "**" + keyword.toUpperCase() + "**"
        );

        if (start > 0) {
            highlighted = "..." + highlighted;
        }
        if (end < text.length()) {
            highlighted = highlighted + "...";
        }

        return highlighted;
    }
}
