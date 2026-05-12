package t.esprit.arctic.jobmatch.freelance.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import t.esprit.arctic.jobmatch.freelance.entity.FreelanceInvoice;

import java.util.List;

public interface FreelanceInvoiceRepository extends JpaRepository<FreelanceInvoice, Long> {
    List<FreelanceInvoice> findByClientIdOrderByCreatedAtDesc(Long clientId);
    List<FreelanceInvoice> findByFreelancerIdOrderByCreatedAtDesc(Long freelancerId);
}
