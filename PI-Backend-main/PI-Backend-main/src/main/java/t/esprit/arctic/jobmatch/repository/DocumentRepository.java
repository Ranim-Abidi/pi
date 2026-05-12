package t.esprit.arctic.jobmatch.repository;

import t.esprit.arctic.jobmatch.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import t.esprit.arctic.jobmatch.entity.TypeDocument;

import java.time.LocalDateTime;
import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findByCandidatId(Long candidatId);
    List<Document> findByCreatedAtBefore(LocalDateTime date);
    List<Document> findByUpdatedAtBefore(LocalDateTime date);
    List<Document> findByType(String type);


    List<Document> findByType(TypeDocument type);

     //Trouve les documents orphelins non associés à un candidat

    List<Document> findByCandidatIsNull();


     //Compte les documents par type
    long countByType(String type);

     //Compte les documents créés après une certaine date
    long countByCreatedAtAfter(LocalDateTime date);

     //Compte les documents par candidat et type
    long countByCandidatIdAndType(Long candidatId, String type);


     // Trouve les CVs d'un candidat

    List<Document> findByCandidatIdAndType(Long candidatId, String type);

     //Compte les documents créés après une date pour un candidat
    long countByCandidatIdAndCreatedAtAfter(Long candidatId, LocalDateTime date);

     //Compte les documents archivés pour un candidat
    long countByCandidatIdAndArchiveTrue(Long candidatId);

     //Trouve les documents par type et candidat
    List<Document> findByTypeAndCandidatId(String type, Long candidatId);

     //Trouve les CVs avec un score ATS inférieur à un seuil
    List<Document> findByTypeAndScoreATSLessThan(String type, Integer score);

     //Supprime les documents orphelins créés avant une date

    void deleteByCandidatIsNullAndCreatedAtBefore(LocalDateTime date);

     //Trouve les documents archivés
    List<Document> findByArchiveTrue();

     // Trouve les documents non archivés
    List<Document> findByArchiveFalseOrArchiveIsNull();

    // ============ VOS MÉTHODES EXISTANTES AVEC KEYWORDS ============
    List<Document> findTop5ByCandidatIdAndNomContainingIgnoreCaseOrderByCreatedAtDesc(Long candidatId, String nom);
    List<Document> findByNomContainingIgnoreCase(String nom);
    List<Document> findByTypeAndNomContainingIgnoreCase(String type, String nom);
    List<Document> findByCandidatPrenomContainingIgnoreCase(String prenom);
    List<Document> findByCandidatNomContainingIgnoreCaseOrNomContainingIgnoreCase(String candidatNom, String documentNom);
    List<Document> findByNomContainingIgnoreCaseOrderByCreatedAtDesc(String nom);
    boolean existsByCandidatIdAndType(Long candidatId, String type);
    long countByCandidatId(Long candidatId);
    void deleteByType(String type);
    List<Document> findByCreatedAtBetween(LocalDateTime debut, LocalDateTime fin);
    List<Document> findTop5ByCandidatIdOrderByCreatedAtDesc(Long candidatId);
    List<Document> findByTypeIn(List<String> types);
    List<Document> findByContenuIsNotNull();
    List<Document> findByNomStartingWithIgnoreCase(String prefix);
    List<Document> findByNomEndingWithIgnoreCase(String suffix);
    List<Document> findByCandidatIdAndTypeOrderByCreatedAtDesc(Long candidatId, String type);
}