package t.esprit.arctic.jobmatch.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UtilisateurSearchDto {

    private Long id;
    private String nom;
    private String email;
    private String role;
}
