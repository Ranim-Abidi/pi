package t.esprit.arctic.jobmatch.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EntretienTestPublicDto {
    private Long id;
    private String titre;
    private String description;
    /** Code enum (ex. INFORMATIQUE) */
    private String domaine;
    /** Libellé affiché (ex. Informatique) */
    private String domaineLabel;
    private LocalDateTime dateEntretien;
    private String photo;
}
