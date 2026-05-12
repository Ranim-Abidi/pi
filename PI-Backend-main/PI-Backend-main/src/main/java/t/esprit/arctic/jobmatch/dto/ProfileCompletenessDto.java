package t.esprit.arctic.jobmatch.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ProfileCompletenessDto {
    private Long candidatId;
    private String email;
    private String nom;
    private boolean isComplete;
    private boolean hasTelephone;
    private boolean hasDescription;
    private boolean hasLocalisation;
    private boolean hasCompetences;
    private boolean hasEducation;
    private int completenessPercentage;
    private String missingFields;
}
