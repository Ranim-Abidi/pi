package t.esprit.arctic.jobmatch.freelance.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class MissionDTO {

    @NotBlank(message = "Le titre est obligatoire")
    private String titre;

    @NotBlank(message = "La description est obligatoire")
    private String description;

    @NotNull
    @Positive(message = "Le budget doit être positif")
    private Double budget;

    private List<String> competences;
    private String experienceLevel;
    private String location;
    private Boolean remoteAvailable;
    private String availability;
}