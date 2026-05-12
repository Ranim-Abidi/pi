package t.esprit.arctic.jobmatch.dto;

public class DocSuggestion {
    private String id;
    private String titre;
    private String source;      // "DevDocs.io", "dev.to", "GitHub"
    private String sourceType;  // "devdocs", "devto", "github"
    private String url;

    public DocSuggestion(String id, String titre, String source,
                         String sourceType, String url) {
        this.id         = id;
        this.titre      = titre;
        this.source     = source;
        this.sourceType = sourceType;
        this.url        = url;
    }

    public String getId()         { return id; }
    public String getTitre()      { return titre; }
    public String getSource()     { return source; }
    public String getSourceType() { return sourceType; }
    public String getUrl()        { return url; }
}