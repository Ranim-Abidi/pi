package t.esprit.arctic.jobmatch.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CandidateStatsDTO {
    
    private Long candidatId;
    private String candidatName;
    private String email;
    
    // Application stats
    private Long totalApplications;
    private Long acceptedApplications;
    private Long rejectedApplications;
    private Long pendingApplications;
    
    // Formation stats
    private Long totalFormations;
    private Long completedFormations;
    private Long inProgressFormations;
    
    // Profile stats
    private Integer profileCompleteness; // 0-100%
    private Integer competencesCount;
    private Boolean cvUploaded;
    private Boolean profilePictureUploaded;
    
    // Engagement stats
    private Integer messagesCount;
    private Integer savedJobsCount;
    private Integer viewsCount;
    
    // Calculated fields
    private Double applicationSuccessRate;
    private Double formationCompletionRate;
}
