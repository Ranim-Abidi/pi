package t.esprit.arctic.jobmatch.freelance.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import t.esprit.arctic.jobmatch.freelance.entity.FreelanceChatRoom;

import java.util.List;
import java.util.Optional;

@Repository
public interface FreelanceChatRoomRepository extends JpaRepository<FreelanceChatRoom, Long> {
    
    @Query("SELECT r FROM FreelanceChatRoom r WHERE r.client.id = :userId OR r.freelancer.id = :userId")
    List<FreelanceChatRoom> findByUserId(Long userId);

    @Query("SELECT r FROM FreelanceChatRoom r WHERE r.mission.id = :missionId AND r.client.id = :clientId AND r.freelancer.id = :freelancerId")
    Optional<FreelanceChatRoom> findByParticipantsAndMission(Long missionId, Long clientId, Long freelancerId);
}
