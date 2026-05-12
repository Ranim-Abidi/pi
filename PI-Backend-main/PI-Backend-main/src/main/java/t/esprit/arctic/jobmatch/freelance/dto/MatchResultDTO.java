package t.esprit.arctic.jobmatch.freelance.dto;

import lombok.*;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class MatchResultDTO {
    private Long id;
    private String titre;
    private String description;
    private Double budget;
    private List<String> competences;
    private String statut;
    private String nom;          // name of the freelancer or client
    private double matchScore;   // 0.0 – 1.0
    private int matchPercent;    // 0 – 100
    private List<String> matchingSkills;   // skills that matched
}
