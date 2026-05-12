package t.esprit.arctic.jobmatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import t.esprit.arctic.jobmatch.entity.ChatbotHistory;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatbotHistoryRepository extends JpaRepository<ChatbotHistory, Long> {
    Optional<ChatbotHistory> findByCandidatIdAndFormationId(Long candidatId, Long formationId);
    List<ChatbotHistory> findAllByCandidatIdAndFormationIdOrderByCreatedAtDesc(Long candidatId, Long formationId);
    Optional<ChatbotHistory> findBySessionId(String sessionId);
}
