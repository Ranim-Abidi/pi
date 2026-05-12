package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import t.esprit.arctic.jobmatch.dto.ConnectionStatsDto;
import t.esprit.arctic.jobmatch.entity.LoginHistory;
import t.esprit.arctic.jobmatch.entity.Utilisateur;
import t.esprit.arctic.jobmatch.repository.LoginHistoryRepository;
import t.esprit.arctic.jobmatch.repository.UtilisateurRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LoginHistoryService {

    private final LoginHistoryRepository loginHistoryRepository;
    private final UtilisateurRepository utilisateurRepository;

    @Transactional
    public void recordLogin(Long userId, String ipAddress, String userAgent) {
        Utilisateur user = utilisateurRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'id: " + userId));

        LoginHistory loginHistory = new LoginHistory(user, LocalDateTime.now(), ipAddress, userAgent);
        loginHistoryRepository.save(loginHistory);
    }

    @Transactional
    public void recordLoginByEmail(String email, String ipAddress, String userAgent) {
        Utilisateur user = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'email: " + email));

        LoginHistory loginHistory = new LoginHistory(user, LocalDateTime.now(), ipAddress, userAgent);
        loginHistoryRepository.save(loginHistory);
    }

    public long countConnectionsByUserId(Long userId) {
        return loginHistoryRepository.countConnectionsByUserId(userId);
    }

    public long countConnectionsByEmail(String email) {
        Utilisateur user = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'email: " + email));
        return loginHistoryRepository.countConnectionsByUserId(user.getId());
    }

    public ConnectionStatsDto getConnectionStats(Long userId) {
        Utilisateur user = utilisateurRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'id: " + userId));

        long totalConnections = loginHistoryRepository.countConnectionsByUserId(userId);

        List<LoginHistory> loginHistories = loginHistoryRepository.findByUtilisateurOrderByLoginDateDesc(user);
        
        LocalDateTime lastLoginDate = null;
        String lastLoginIpAddress = null;
        
        if (!loginHistories.isEmpty()) {
            LoginHistory lastLogin = loginHistories.get(0);
            lastLoginDate = lastLogin.getLoginDate();
            lastLoginIpAddress = lastLogin.getIpAddress();
        }

        return new ConnectionStatsDto(
                user.getId(),
                user.getEmail(),
                user.getNom(),
                totalConnections,
                lastLoginDate,
                lastLoginIpAddress
        );
    }

    public List<LoginHistory> getLoginHistoryForUser(Long userId) {
        return loginHistoryRepository.findLoginHistoryByUserId(userId);
    }

    public List<ConnectionStatsDto> getAllConnectionStats() {
        List<Utilisateur> users = utilisateurRepository.findAll();
        
        return users.stream()
                .map(user -> {
                    long totalConnections = loginHistoryRepository.countConnectionsByUserId(user.getId());
                    List<LoginHistory> loginHistories = loginHistoryRepository.findByUtilisateurOrderByLoginDateDesc(user);
                    
                    LocalDateTime lastLoginDate = null;
                    String lastLoginIpAddress = null;
                    
                    if (!loginHistories.isEmpty()) {
                        LoginHistory lastLogin = loginHistories.get(0);
                        lastLoginDate = lastLogin.getLoginDate();
                        lastLoginIpAddress = lastLogin.getIpAddress();
                    }

                    return new ConnectionStatsDto(
                            user.getId(),
                            user.getEmail(),
                            user.getNom(),
                            totalConnections,
                            lastLoginDate,
                            lastLoginIpAddress
                    );
                })
                .collect(Collectors.toList());
    }
}
