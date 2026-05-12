package t.esprit.arctic.jobmatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import t.esprit.arctic.jobmatch.entity.Background;

import java.util.List;

@Repository
public interface BackgroundRepository extends JpaRepository<Background, Long> {
    List<Background> findByCandidatId(Long candidatId);
}
