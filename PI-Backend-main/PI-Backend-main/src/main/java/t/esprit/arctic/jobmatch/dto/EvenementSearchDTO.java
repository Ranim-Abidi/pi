package t.esprit.arctic.jobmatch.dto;

import lombok.*;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class EvenementSearchDTO {

    private List<EvenementResponse> resultats;
    private List<EvenementResponse> suggestions;
    private List<String> historiqueRecherches;
    private int totalResultats;
}