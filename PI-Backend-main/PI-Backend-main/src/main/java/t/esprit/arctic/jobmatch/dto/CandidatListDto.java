package t.esprit.arctic.jobmatch.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Projection légère pour GET /api/candidats (listes, dropdowns) sans relations Hibernate.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CandidatListDto {
    private Long id;
    private String nom;
    private String prenom;
    private String email;
    private String telephone;
}
