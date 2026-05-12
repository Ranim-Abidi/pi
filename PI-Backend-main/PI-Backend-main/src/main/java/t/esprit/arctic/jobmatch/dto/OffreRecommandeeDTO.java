package t.esprit.arctic.jobmatch.dto;

public class OffreRecommandeeDTO {
    private String jobId;
    private String jobTitle;
    private String jobDomain;
    private String jobLocation;
    private String jobSkills;
    private Double scoreMatch;
    private String source;
    private String raison;

    // Constructeur par défaut
    public OffreRecommandeeDTO() {}

    // Constructeur avec paramètres
    public OffreRecommandeeDTO(String jobId, String jobTitle, String jobDomain,
                               String jobLocation, String jobSkills,
                               Double scoreMatch, String source, String raison) {
        this.jobId = jobId;
        this.jobTitle = jobTitle;
        this.jobDomain = jobDomain;
        this.jobLocation = jobLocation;
        this.jobSkills = jobSkills;
        this.scoreMatch = scoreMatch;
        this.source = source;
        this.raison = raison;
    }

    // Getters
    public String getJobId() { return jobId; }
    public String getJobTitle() { return jobTitle; }
    public String getJobDomain() { return jobDomain; }
    public String getJobLocation() { return jobLocation; }
    public String getJobSkills() { return jobSkills; }
    public Double getScoreMatch() { return scoreMatch; }
    public String getSource() { return source; }
    public String getRaison() { return raison; }

    // Setters
    public void setJobId(String jobId) { this.jobId = jobId; }
    public void setJobTitle(String jobTitle) { this.jobTitle = jobTitle; }
    public void setJobDomain(String jobDomain) { this.jobDomain = jobDomain; }
    public void setJobLocation(String jobLocation) { this.jobLocation = jobLocation; }
    public void setJobSkills(String jobSkills) { this.jobSkills = jobSkills; }
    public void setScoreMatch(Double scoreMatch) { this.scoreMatch = scoreMatch; }
    public void setSource(String source) { this.source = source; }
    public void setRaison(String raison) { this.raison = raison; }
}