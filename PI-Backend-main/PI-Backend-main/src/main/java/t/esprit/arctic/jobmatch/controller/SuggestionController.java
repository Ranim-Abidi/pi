package t.esprit.arctic.jobmatch.controller;

import t.esprit.arctic.jobmatch.dto.FormationSuggestion;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.*;

@RestController
@RequestMapping("/api/suggestions")
public class SuggestionController {

    @Value("${youtube.api.key:}")
    private String youtubeApiKey;

    @Value("${google.search.api.key:}")
    private String googleApiKey;

    @Value("${google.search.cx:}")
    private String googleCx;

    private final HttpClient  http   = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();


    @GetMapping("/formations")
    public ResponseEntity<List<FormationSuggestion>> suggest(
            @RequestParam String titre,
            @RequestParam(required = false) String niveau) throws Exception {
        if (youtubeApiKey == null || youtubeApiKey.isBlank()
                || googleApiKey == null || googleApiKey.isBlank()
                || googleCx == null || googleCx.isBlank()) {
            return ResponseEntity.ok(List.of());
        }
        String baseTitre = titre.trim().toLowerCase();
        // Sujet principal : le premier mot (ex: "Angular") pour filtrer les faux résultats
        final String primaryTopic = baseTitre.split("[\\s\\-\\:]+")[0];

        String levelTerms = "";

        if (niveau != null && !niveau.isBlank()) {
            String n = niveau.trim().toLowerCase();
            // N'ajouter les termes de niveau que si le titre n'en contient pas déjà de manière explicite
            boolean hasLevelInTitre = baseTitre.contains("débutant") || baseTitre.contains("beginner") ||
                                      baseTitre.contains("interm") || baseTitre.contains("medium") ||
                                      baseTitre.contains("avanc") || baseTitre.contains("advanced") ||
                                      baseTitre.contains("expert") || baseTitre.contains("senior");

            if (!hasLevelInTitre) {
                if (n.contains("débutant") || n.contains("debutant")) {
                    levelTerms = " beginner introduction";
                } else if (n.contains("interm") || n.contains("medium")) {
                    // Pour intermédiaire, "projects" et "advanced" donnent souvent des résultats de meilleur niveau
                    levelTerms = " intermediate projects advanced";
                } else if (n.contains("avanc") || n.contains("advanced")) {
                    levelTerms = " advanced masterclass";
                } else if (n.contains("expert") || n.contains("senior")) {
                    levelTerms = " expert advanced senior";
                } else {
                    levelTerms = " " + niveau;
                }
            }
        }

        // Recherche simplifiée
        String query = URLEncoder.encode(titre + levelTerms, StandardCharsets.UTF_8);

        List<FormationSuggestion> suggestions = fetchSuggestions(query, titre, niveau, primaryTopic);

        // Fallback si aucun résultat (en restant filtré sur le sujet principal)
        if (suggestions.isEmpty()) {
            suggestions = fetchSuggestions(URLEncoder.encode(titre, StandardCharsets.UTF_8), titre, niveau, primaryTopic);
        }

        return ResponseEntity.ok(suggestions);
    }

    private List<FormationSuggestion> fetchSuggestions(String encodedQuery, String originalTitre, String requestedNiveau, String primaryTopic) throws Exception {
        // Suppression de relevanceLanguage=fr pour permettre les résultats internationaux de haute qualité
        String ytUrl = "https://www.googleapis.com/youtube/v3/search"
                + "?part=snippet&type=playlist"
                + "&maxResults=10&order=relevance&q=" + encodedQuery
                + "&key=" + youtubeApiKey;

        HttpResponse<String> response = http.send(
                HttpRequest.newBuilder().uri(URI.create(ytUrl))
                        .header("Accept", "application/json").build(),
                HttpResponse.BodyHandlers.ofString()
        );

        JsonNode root = mapper.readTree(response.body());
        if (root.has("error") || !root.has("items")) {
            return new ArrayList<>();
        }

        List<FormationSuggestion> suggestions = new ArrayList<>();
        String topicLower = primaryTopic.toLowerCase();

        for (JsonNode item : root.path("items")) {
            String playlistId  = item.path("id").path("playlistId").asText();
            String videoTitle  = item.path("snippet").path("title").asText();
            String channelName = item.path("snippet").path("channelTitle").asText();
            String thumbnail   = item.path("snippet")
                    .path("thumbnails").path("medium").path("url").asText();

            if (playlistId.isEmpty() || playlistId.equals("null")) continue;

            // ── FILTRAGE DE PERTINENCE STRICT ──
            // Le sujet principal doit être présent dans le titre ou le nom de la chaîne
            String titleLower = videoTitle.toLowerCase();
            String chanLower  = channelName.toLowerCase();
            if (!titleLower.contains(topicLower) && !chanLower.contains(topicLower)) {
                continue;
            }

            int nbVideos = getPlaylistVideoCount(playlistId);
            if (nbVideos < 3) continue;

            String niveauFinal = (requestedNiveau != null && !requestedNiveau.isBlank()) ? requestedNiveau : detectNiveau(videoTitle);

            suggestions.add(new FormationSuggestion(
                    playlistId, videoTitle, thumbnail, channelName,
                    "", detectCategorie(videoTitle), niveauFinal, nbVideos
            ));
            if (suggestions.size() >= 3) break;
        }
        return suggestions;
    }


    @GetMapping("/playlist-videos/{playlistId}")
    public ResponseEntity<List<JsonNode>> getPlaylistVideos(
            @PathVariable String playlistId) throws Exception {

        String ytUrl = "https://www.googleapis.com/youtube/v3/playlistItems"
                + "?part=snippet&maxResults=50&playlistId=" + playlistId
                + "&key=" + youtubeApiKey;

        HttpResponse<String> response = http.send(
                HttpRequest.newBuilder().uri(URI.create(ytUrl))
                        .header("Accept", "application/json").build(),
                HttpResponse.BodyHandlers.ofString()
        );

        JsonNode root = mapper.readTree(response.body());
        if (root.has("error")) return ResponseEntity.ok(new ArrayList<>());

        List<JsonNode> videos = new ArrayList<>();
        int position = 1;
        for (JsonNode item : root.path("items")) {
            String videoId = item.path("snippet")
                    .path("resourceId").path("videoId").asText();
            String title   = item.path("snippet").path("title").asText();

            if ("Private video".equals(title) || "Deleted video".equals(title)) continue;

            String thumbnail = item.path("snippet")
                    .path("thumbnails").path("medium").path("url").asText("");
            if (thumbnail.isEmpty()) {
                thumbnail = item.path("snippet")
                        .path("thumbnails").path("default").path("url").asText("");
            }

            com.fasterxml.jackson.databind.node.ObjectNode v =
                    mapper.createObjectNode();
            v.put("videoId",   videoId);
            v.put("title",     title);
            v.put("thumbnail", thumbnail);
            v.put("position",  position++);
            videos.add(v);
        }
        return ResponseEntity.ok(videos);
    }

    @GetMapping("/docs/auto")
    public ResponseEntity<Map<String, Object>> findDocAuto(
            @RequestParam String titre) throws Exception {

        List<Map<String, String>> results = new ArrayList<>();

        try {
            String query = URLEncoder.encode(
                titre + " documentation tutorial",
                StandardCharsets.UTF_8
            );

            String ddgUrl = "https://api.duckduckgo.com/?q=" + query
                + "&format=json&no_html=1&skip_disambig=1";

            HttpResponse<String> ddgResp = http.send(
                HttpRequest.newBuilder()
                    .uri(URI.create(ddgUrl))
                    .header("User-Agent", "Mozilla/5.0")
                    .build(),
                HttpResponse.BodyHandlers.ofString()
            );

            JsonNode ddg = mapper.readTree(ddgResp.body());

            JsonNode relatedTopics = ddg.path("RelatedTopics");
            if (relatedTopics.isArray()) {
                for (JsonNode topic : relatedTopics) {
                    String url  = topic.path("FirstURL").asText("");
                    String text = topic.path("Text").asText("");
                    if (url.isEmpty() || text.isEmpty()) continue;

                    Map<String, String> r = new HashMap<>();
                    r.put("title",   text.length() > 80
                        ? text.substring(0, 80) + "..." : text);
                    r.put("url",     url);
                    r.put("snippet", text);
                    r.put("source",  extractDomain(url));
                    r.put("type",    "proxy");
                    results.add(r);
                    if (results.size() >= 3) break;
                }
            }

            if (results.isEmpty()) {
                results.addAll(buildDirectUrls(titre));
            }

        } catch (Exception e) {
            System.err.println("Search error: " + e.getMessage());
            results.addAll(buildDirectUrls(titre));
        }

        Map<String, Object> result = new HashMap<>();
        result.put("results", results);
        result.put("query",   titre);
        return ResponseEntity.ok(result);
    }

    private List<Map<String, String>> buildDirectUrls(String titre) {
        List<Map<String, String>> results = new ArrayList<>();
        String t = titre.toLowerCase();

        String url  = null;
        String name = null;

        if (t.contains("angular")) {
            url = "https://angular.io/docs"; name = "angular.io"; }
        else if (t.contains("react")) {
            url = "https://react.dev/learn"; name = "react.dev"; }
        else if (t.contains("vue")) {
            url = "https://vuejs.org/guide/introduction.html"; name = "vuejs.org"; }
        else if (t.contains("python")) {
            url = "https://docs.python.org/fr/3/tutorial/index.html"; name = "docs.python.org"; }
        else if (t.contains("javascript") || t.contains("js")) {
            url = "https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide"; name = "MDN"; }
        else if (t.contains("html")) {
            url = "https://developer.mozilla.org/fr/docs/Learn/HTML"; name = "MDN"; }
        else if (t.contains("css")) {
            url = "https://developer.mozilla.org/fr/docs/Learn/CSS"; name = "MDN"; }
        else if (t.contains("node")) {
            url = "https://nodejs.org/fr/docs"; name = "nodejs.org"; }
        else if (t.contains("spring")) {
            url = "https://spring.io/guides"; name = "spring.io"; }
        else if (t.contains("docker")) {
            url = "https://docs.docker.com/get-started/"; name = "docs.docker.com"; }
        else if (t.contains("kubernetes") || t.contains("k8s")) {
            url = "https://kubernetes.io/fr/docs/home/"; name = "kubernetes.io"; }
        else if (t.contains("php")) {
            url = "https://www.php.net/manual/fr/"; name = "php.net"; }
        else if (t.contains("laravel")) {
            url = "https://laravel.com/docs"; name = "laravel.com"; }
        else if (t.contains("django")) {
            url = "https://docs.djangoproject.com/fr/"; name = "djangoproject.com"; }
        else if (t.contains("flutter")) {
            url = "https://docs.flutter.dev/get-started/codelab"; name = "docs.flutter.dev"; }
        else if (t.contains("kotlin")) {
            url = "https://kotlinlang.org/docs/getting-started.html"; name = "kotlinlang.org"; }
        else if (t.contains("swift")) {
            url = "https://docs.swift.org/swift-book/"; name = "swift.org"; }
        else if (t.contains("rust")) {
            url = "https://doc.rust-lang.org/book/"; name = "rust-lang.org"; }
        else if (t.contains("go") || t.contains("golang")) {
            url = "https://go.dev/doc/"; name = "go.dev"; }
        else if (t.contains("c++") || t.contains("cpp")) {
            url = "https://www.cplusplus.com/doc/tutorial/"; name = "cplusplus.com"; }
        else if (t.contains("java") && !t.contains("javascript")) {
            url = "https://dev.java/learn/"; name = "dev.java"; }
        else if (t.contains("typescript")) {
            url = "https://www.typescriptlang.org/docs/"; name = "typescriptlang.org"; }
        else if (t.contains("sql") || t.contains("mysql")) {
            url = "https://dev.mysql.com/doc/refman/8.0/en/tutorial.html"; name = "mysql.com"; }
        else if (t.contains("mongodb")) {
            url = "https://www.mongodb.com/docs/manual/tutorial/"; name = "mongodb.com"; }
        else if (t.contains("tensorflow")) {
            url = "https://www.tensorflow.org/tutorials"; name = "tensorflow.org"; }
        else if (t.contains("pandas")) {
            url = "https://pandas.pydata.org/docs/getting_started/index.html"; name = "pandas.pydata.org"; }
        else if (t.contains("power bi") || t.contains("powerbi")) {
            url = "https://learn.microsoft.com/fr-fr/power-bi/"; name = "learn.microsoft.com"; }
        else if (t.contains("aws")) {
            url = "https://docs.aws.amazon.com/"; name = "docs.aws.amazon.com"; }
        else if (t.contains("git")) {
            url = "https://git-scm.com/doc"; name = "git-scm.com"; }
        else if (t.contains("linux") || t.contains("bash")) {
            url = "https://www.gnu.org/software/bash/manual/"; name = "gnu.org"; }
        else {
            url  = "https://developer.mozilla.org/fr/docs/Learn";
            name = "MDN Web Docs";
        }

        Map<String, String> r = new HashMap<>();
        r.put("title",   titre + " — Documentation officielle");
        r.put("url",     url);
        r.put("snippet", "Documentation officielle pour " + titre);
        r.put("source",  name);
        r.put("type",    "proxy");
        results.add(r);

        return results;
    }


    private int getPlaylistVideoCount(String playlistId) {
        try {
            String url = "https://www.googleapis.com/youtube/v3/playlists"
                    + "?part=contentDetails&id=" + playlistId
                    + "&key=" + youtubeApiKey;
            HttpResponse<String> resp = http.send(
                    HttpRequest.newBuilder().uri(URI.create(url)).build(),
                    HttpResponse.BodyHandlers.ofString()
            );
            JsonNode root  = mapper.readTree(resp.body());
            JsonNode items = root.path("items");
            if (items.isArray() && items.size() > 0)
                return items.get(0).path("contentDetails")
                        .path("itemCount").asInt(0);
        } catch (Exception e) { return 10; }
        return 0;
    }

    private String extractDomain(String url) {
        try {
            java.net.URL u = new java.net.URL(url);
            return u.getHost().replace("www.", "");
        } catch (Exception e) { return url; }
    }

    private List<FormationSuggestion> fallbackSuggestion(String titre) {
        List<FormationSuggestion> list = new ArrayList<>();
        list.add(new FormationSuggestion(
                "", "Quota YouTube dépassé — saisir manuellement",
                "https://cdn-icons-png.flaticon.com/512/376/376048.png",
                "Système", "", detectCategorie(titre), detectNiveau(titre), 0
        ));
        return list;
    }

    private String detectCategorie(String titre) {
        String t = titre.toLowerCase();
        if (t.contains("react") || t.contains("angular") || t.contains("vue") ||
                t.contains("html") || t.contains("css") || t.contains("javascript"))
            return "Frontend";
        if (t.contains("spring") || t.contains("node") || t.contains("django") ||
                t.contains("laravel") || t.contains("php") || t.contains("java"))
            return "Backend";
        if (t.contains("docker") || t.contains("kubernetes") ||
                t.contains("aws") || t.contains("devops") || t.contains("linux"))
            return "DevOps";
        if (t.contains("machine learning") || t.contains("deep learning") ||
                t.contains("tensorflow") || t.contains("ia") ||
                t.contains("intelligence"))
            return "IA";
        if (t.contains("pandas") || t.contains("sql") ||
                t.contains("data") || t.contains("power bi"))
            return "Data";
        if (t.contains("figma") || t.contains("ux") || t.contains("design"))
            return "Design";
        if (t.contains("flutter") || t.contains("android") ||
                t.contains("ios") || t.contains("swift") || t.contains("kotlin"))
            return "Mobile";
        return "Développement";
    }

    private String detectNiveau(String titre) {
        String t = titre.toLowerCase();
        if (t.contains("débutant") || t.contains("initiation") ||
                t.contains("introduction") || t.contains("bases") ||
                t.contains("beginner") || t.contains("zéro") ||
                t.contains("level 1") || t.contains("101"))
            return "Débutant";

        if (t.contains("avancé") || t.contains("expert") ||
                t.contains("master") || t.contains("advanced") ||
                t.contains("professional") || t.contains("senior"))
            return "Avancé";

        // Si le titre contient "tutorial", "course", "tuto" sans préciser le niveau, c'est souvent Débutant
        if (t.contains("tutorial") || t.contains("cours") || t.contains("guide"))
            return "Débutant";

        return "Intermédiaire";
    }
}
