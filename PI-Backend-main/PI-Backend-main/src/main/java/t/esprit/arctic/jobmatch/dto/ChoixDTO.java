package t.esprit.arctic.jobmatch.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChoixDTO {
    private Long id;
    private String texte;
    private boolean correcte;
    private int ordre;

    // Getters explicites
    public Long getId() {
        return id;
    }

    public String getTexte() {
        return texte;
    }

    public boolean isCorrecte() {
        return correcte;
    }

    public int getOrdre() {
        return ordre;
    }
}
