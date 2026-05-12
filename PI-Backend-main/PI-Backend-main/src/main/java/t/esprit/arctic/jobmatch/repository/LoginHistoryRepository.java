package t.esprit.arctic.jobmatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import t.esprit.arctic.jobmatch.entity.LoginHistory;
import t.esprit.arctic.jobmatch.entity.Utilisateur;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LoginHistoryRepository extends JpaRepository<LoginHistory, Long> {

    List<LoginHistory> findByUtilisateur(Utilisateur utilisateur);

    List<LoginHistory> findByUtilisateurOrderByLoginDateDesc(Utilisateur utilisateur);

    @Query("SELECT COUNT(lh) FROM LoginHistory lh WHERE lh.utilisateur.id = ?1")
    long countConnectionsByUserId(Long userId);

    @Query("SELECT COUNT(lh) FROM LoginHistory lh WHERE lh.utilisateur.id = ?1 AND lh.loginDate >= ?2")
    long countConnectionsByUserIdAndDateAfter(Long userId, LocalDateTime date);

    @Query("SELECT lh FROM LoginHistory lh WHERE lh.utilisateur.id = ?1 ORDER BY lh.loginDate DESC")
    List<LoginHistory> findLoginHistoryByUserId(Long userId);
}
