package t.esprit.arctic.jobmatch.dto;

public class FormationSuggestion {
    private String playlistId;
    private String titre;
    private String thumbnail;
    private String chaineYoutube;
    private String writtenUrl;
    private String categorie;
    private String niveau;
    private int    nbVideos;

    public FormationSuggestion(String playlistId, String titre, String thumbnail,
                               String chaineYoutube, String writtenUrl,
                               String categorie, String niveau, int nbVideos) {
        this.playlistId    = playlistId;
        this.titre         = titre;
        this.thumbnail     = thumbnail;
        this.chaineYoutube = chaineYoutube;
        this.writtenUrl    = writtenUrl;
        this.categorie     = categorie;
        this.niveau        = niveau;
        this.nbVideos      = nbVideos;
    }

    public String getPlaylistId()    { return playlistId; }
    public String getTitre()         { return titre; }
    public String getThumbnail()     { return thumbnail; }
    public String getChaineYoutube() { return chaineYoutube; }
    public String getWrittenUrl()    { return writtenUrl; }
    public String getCategorie()     { return categorie; }
    public String getNiveau()        { return niveau; }
    public int    getNbVideos()      { return nbVideos; }
}