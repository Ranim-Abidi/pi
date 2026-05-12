package t.esprit.arctic.jobmatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import t.esprit.arctic.jobmatch.entity.OrganisateurEvenement;

import java.util.Optional;

public interface OrganisateurEvenementRepository extends JpaRepository<OrganisateurEvenement, Long> {

    Optional<OrganisateurEvenement> findByEmail(String email);
}
