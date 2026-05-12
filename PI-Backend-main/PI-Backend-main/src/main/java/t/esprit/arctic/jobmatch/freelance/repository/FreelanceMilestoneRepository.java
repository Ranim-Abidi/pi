package t.esprit.arctic.jobmatch.freelance.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import t.esprit.arctic.jobmatch.freelance.entity.FreelanceMilestone;
import t.esprit.arctic.jobmatch.freelance.entity.MilestoneStatus;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface FreelanceMilestoneRepository extends JpaRepository<FreelanceMilestone, Long> {
    List<FreelanceMilestone> findByContractId(Long contractId);
    List<FreelanceMilestone> findByStatusAndSubmittedAtBefore(MilestoneStatus status, LocalDateTime submittedAt);
}
