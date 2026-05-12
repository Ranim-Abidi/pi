package t.esprit.arctic.jobmatch.freelance.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import t.esprit.arctic.jobmatch.freelance.entity.FreelancePayment;

import java.util.List;

@Repository
public interface FreelancePaymentRepository extends JpaRepository<FreelancePayment, Long> {
    List<FreelancePayment> findByContractId(Long contractId);

    @Query("SELECT p FROM FreelancePayment p WHERE p.contract.freelancer.id = :userId")
    List<FreelancePayment> findByFreelancerId(@Param("userId") Long userId);

    @Query("SELECT p FROM FreelancePayment p WHERE p.contract.client.id = :userId")
    List<FreelancePayment> findByClientId(@Param("userId") Long userId);
}
