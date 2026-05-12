package t.esprit.arctic.jobmatch.dto;

public class FormationStatsDTO {

    private Long    formationId;
    private String  titre;
    private String  categorie;
    private String  niveau;
    private String  statut;
    private String  badge;
    private Long    totalInscrits;
    private Double  noteMoyenne;
    private Long    totalCertifies;
    private Long    totalTermines;
    private Double  tauxCompletion;
    private Double  scorePopularite;

    public FormationStatsDTO(
            Long formationId, String titre, String categorie,
            String niveau, String statut, String badge,
            Long totalInscrits, Double noteMoyenne,
            Long totalCertifies, int totalTermines) {
        this(formationId, titre, categorie, niveau, statut, badge, totalInscrits, noteMoyenne, totalCertifies, (long) totalTermines);
    }

    public FormationStatsDTO(
            Long formationId, String titre, String categorie,
            String niveau, String statut, String badge,
            Long totalInscrits, Double noteMoyenne,
            Long totalCertifies, Long totalTermines) {

        this.formationId   = formationId;
        this.titre         = titre;
        this.categorie     = categorie;
        this.niveau        = niveau;
        this.statut        = statut;
        this.badge         = badge;
        this.totalInscrits = totalInscrits != null ? totalInscrits : 0L;

        this.noteMoyenne = (noteMoyenne != null && noteMoyenne > 0)
                ? Math.round(noteMoyenne * 10.0) / 10.0
                : null;

        this.totalCertifies = totalCertifies != null ? totalCertifies : 0L;

        long terminesReel    = totalTermines != null ? totalTermines : 0L;
        long inscritsFinal   = this.totalInscrits;
        this.totalTermines   = Math.min(terminesReel, inscritsFinal);
        this.tauxCompletion  = (inscritsFinal > 0)
                ? Math.min(
                Math.round((double) this.totalTermines / inscritsFinal * 1000) / 10.0,
                100.0)
                : 0.0;

        double sRating = (this.noteMoyenne != null && this.noteMoyenne > 0)
                ? (this.noteMoyenne / 5.0) * 60.0
                : 0.0;

        double sInscrits = (Math.min(inscritsFinal, 100) / 100.0) * 40.0;

        this.scorePopularite = Math.round((sRating + sInscrits) * 10) / 10.0;
    }

    public Long   getFormationId()     { return formationId; }
    public String getTitre()           { return titre; }
    public String getCategorie()       { return categorie; }
    public String getNiveau()          { return niveau; }
    public String getStatut()          { return statut; }
    public String getBadge()           { return badge; }
    public Long   getTotalInscrits()   { return totalInscrits; }
    public Double getNoteMoyenne()     { return noteMoyenne; }
    public Long   getTotalCertifies()  { return totalCertifies; }
    public Long   getTotalTermines()   { return totalTermines; }
    public Double getTauxCompletion()  { return tauxCompletion; }
    public Double getScorePopularite() { return scorePopularite; }
}