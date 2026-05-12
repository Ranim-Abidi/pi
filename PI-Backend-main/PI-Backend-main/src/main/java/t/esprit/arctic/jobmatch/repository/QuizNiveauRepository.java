package t.esprit.arctic.jobmatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import t.esprit.arctic.jobmatch.entity.NiveauOrdre;
import t.esprit.arctic.jobmatch.entity.QuizNiveau;

import java.util.List;
import java.util.Optional;

public interface QuizNiveauRepository extends JpaRepository<QuizNiveau, Long> {

    /** Dernière tentative pour un candidat sur un niveau donné */
    Optional<QuizNiveau> findTopByInscriptionParcoursIdAndNiveauOrderByTentativeDesc(
            Long inscriptionParcoursId, NiveauOrdre niveau);

    /** Toutes les tentatives d'un candidat pour un parcours */
    List<QuizNiveau> findByInscriptionParcoursIdOrderByDateTentativeDesc(Long inscriptionParcoursId);

    /** Vérifie si le candidat a réussi un niveau donné */
    boolean existsByInscriptionParcoursIdAndNiveauAndReussiTrue(
            Long inscriptionParcoursId, NiveauOrdre niveau);

    /** Compte le nombre de tentatives pour un niveau */
    int countByInscriptionParcoursIdAndNiveau(Long inscriptionParcoursId, NiveauOrdre niveau);

    /** Récupère le dernier quiz réussi pour un niveau */
    Optional<QuizNiveau> findFirstByInscriptionParcoursIdAndNiveauAndReussiTrueOrderByDateTentativeDesc(
            Long inscriptionParcoursId, NiveauOrdre niveau);
}
