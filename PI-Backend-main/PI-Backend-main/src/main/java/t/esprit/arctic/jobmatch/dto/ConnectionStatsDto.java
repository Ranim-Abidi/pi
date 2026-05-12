package t.esprit.arctic.jobmatch.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ConnectionStatsDto {
    private Long userId;
    private String email;
    private String nom;
    private long totalConnections;
    private LocalDateTime lastLoginDate;
    private String lastLoginIpAddress;
}
