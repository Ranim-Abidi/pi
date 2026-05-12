package t.esprit.arctic.jobmatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import t.esprit.arctic.jobmatch.entity.Certificat;
import java.util.List;
import java.util.Optional;

public interface CertificatRepository extends JpaRepository<Certificat, Long> {
    @org.springframework.data.jpa.repository.Query("""
        SELECT c FROM Certificat c
        JOIN FETCH c.inscription i
        JOIN FETCH i.formation f
        JOIN FETCH i.candidat cand
        LEFT JOIN FETCH c.parcours p
        WHERE cand.id = :candidatId
    """)
    List<Certificat> findByInscriptionCandidatId(@org.springframework.data.repository.query.Param("candidatId") Long candidatId);
    Optional<Certificat> findByInscriptionId(Long inscriptionId);
    boolean existsByInscriptionId(Long inscriptionId);
    
    @org.springframework.data.jpa.repository.Query("""
        SELECT c FROM Certificat c
        JOIN FETCH c.inscription i
        JOIN FETCH i.formation f
        JOIN FETCH i.candidat cand
        LEFT JOIN FETCH c.parcours p
        WHERE c.verificationCode = :code
    """)
    Optional<Certificat> findByVerificationCode(@org.springframework.data.repository.query.Param("code") String code);
}