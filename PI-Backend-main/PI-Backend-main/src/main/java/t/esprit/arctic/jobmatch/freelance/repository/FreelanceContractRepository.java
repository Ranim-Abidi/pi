package t.esprit.arctic.jobmatch.freelance.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import t.esprit.arctic.jobmatch.freelance.entity.FreelanceContract;

import java.util.List;
import java.util.Optional;

@Repository
public interface FreelanceContractRepository extends JpaRepository<FreelanceContract, Long> {
    List<FreelanceContract> findByClientId(Long clientId);
    List<FreelanceContract> findByFreelancerId(Long freelancerId);
    List<FreelanceContract> findByMissionId(Long missionId);
    Optional<FreelanceContract> findTopByMissionIdAndFreelancerIdOrderByCreatedAtDesc(Long missionId, Long freelancerId);

    boolean existsByClientIdAndFreelancerId(Long clientId, Long freelancerId);
}
