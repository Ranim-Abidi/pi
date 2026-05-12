package t.esprit.arctic.jobmatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import t.esprit.arctic.jobmatch.entity.Recruteur;

import java.util.Optional;

@Repository
public interface RecruteurRepository extends JpaRepository<Recruteur, Long> {
	Optional<Recruteur> findByEmail(String email);
	Optional<Recruteur> findByEmailIgnoreCase(String email);
}
