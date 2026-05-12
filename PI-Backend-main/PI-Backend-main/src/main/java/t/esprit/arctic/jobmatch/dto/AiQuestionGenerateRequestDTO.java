package t.esprit.arctic.jobmatch.dto;

import lombok.Data;

@Data
public class AiQuestionGenerateRequestDTO {
    private String categorie;
    private String niveau;
    private String type;
    private String theme;
    private Integer nombre = 3;
    private Double temperature = 0.7;
}
