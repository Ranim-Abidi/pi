package t.esprit.arctic.jobmatch.freelance.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import t.esprit.arctic.jobmatch.freelance.entity.FreelanceDispute;

import java.util.List;

@Repository
public interface FreelanceDisputeRepository extends JpaRepository<FreelanceDispute, Long> {
    List<FreelanceDispute> findByContractId(Long contractId);
}
