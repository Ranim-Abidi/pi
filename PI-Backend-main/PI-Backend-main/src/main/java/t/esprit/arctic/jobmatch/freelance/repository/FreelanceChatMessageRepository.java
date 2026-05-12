package t.esprit.arctic.jobmatch.freelance.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import t.esprit.arctic.jobmatch.freelance.entity.FreelanceChatMessage;

import java.util.List;

@Repository
public interface FreelanceChatMessageRepository extends JpaRepository<FreelanceChatMessage, Long> {
    List<FreelanceChatMessage> findByRoomIdOrderByCreatedAtAsc(Long roomId);
}
