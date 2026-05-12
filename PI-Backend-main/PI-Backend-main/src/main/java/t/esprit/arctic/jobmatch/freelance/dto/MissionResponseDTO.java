package t.esprit.arctic.jobmatch.freelance.dto;

import lombok.*;
import t.esprit.arctic.jobmatch.freelance.entity.Mission;
import t.esprit.arctic.jobmatch.freelance.entity.MissionStatut;

import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MissionResponseDTO {

    private Long id;
    private String titre;
    private String description;
    private Double budget;
    private List<String> competences;
    private String experienceLevel;
    private String location;
    private Boolean remoteAvailable;
    private String availability;
    private MissionStatut statut;
    private String postedByNom;
    private Long postedById;
    private LocalDateTime dateCreation;

    /**
     * Convert a Mission entity to a response DTO.
     * This avoids LazyInitializationException by extracting all needed data
     * while the Hibernate session is still open (inside @Transactional).
     */
    public static MissionResponseDTO fromEntity(Mission m) {
        return MissionResponseDTO.builder()
                .id(m.getId())
                .titre(m.getTitre())
                .description(m.getDescription())
                .budget(m.getBudget())
                .competences(m.getCompetences())
                .experienceLevel(m.getExperienceLevel())
                .location(m.getLocation())
                .remoteAvailable(m.getRemoteAvailable())
                .availability(m.getAvailability())
                .statut(m.getStatut())
                .postedByNom(m.getPubliePar() != null ? m.getPubliePar().getNom() : null)
                .postedById(m.getPubliePar() != null ? m.getPubliePar().getId() : null)
                .dateCreation(m.getDateCreation())
                .build();
    }
}
