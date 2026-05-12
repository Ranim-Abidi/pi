package t.esprit.arctic.jobmatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import t.esprit.arctic.jobmatch.entity.InscriptionParcours;

import java.util.List;
import java.util.Optional;

public interface InscriptionParcoursRepository extends JpaRepository<InscriptionParcours, Long> {

    Optional<InscriptionParcours> findByCandidatIdAndParcoursId(Long candidatId, Long parcoursId);

    List<InscriptionParcours> findByCandidatId(Long candidatId);

    boolean existsByCandidatIdAndParcoursId(Long candidatId, Long parcoursId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByParcoursId(Long parcoursId);
}
