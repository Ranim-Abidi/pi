package t.esprit.arctic.jobmatch.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public class OffreSalairePredictionRequestDTO {
    @NotBlank
    private String titre;
    @NotBlank
    private String description;
    @NotBlank
    private String entreprise;
    @NotBlank
    private String location;
    @NotBlank
    private String typeContrat;
    @NotNull
    private List<String> competences;

    // Getters and setters
    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getEntreprise() { return entreprise; }
    public void setEntreprise(String entreprise) { this.entreprise = entreprise; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getTypeContrat() { return typeContrat; }
    public void setTypeContrat(String typeContrat) { this.typeContrat = typeContrat; }
    public List<String> getCompetences() { return competences; }
    public void setCompetences(List<String> competences) { this.competences = competences; }
}
