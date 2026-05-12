package t.esprit.arctic.jobmatch.freelance.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import t.esprit.arctic.jobmatch.entity.Utilisateur;
import t.esprit.arctic.jobmatch.freelance.entity.CandidatureMission;
import t.esprit.arctic.jobmatch.freelance.entity.CandidatureStatut;

import java.util.List;

public interface CandidatureMissionRepository extends JpaRepository<CandidatureMission, Long>, JpaSpecificationExecutor<CandidatureMission> {
    List<CandidatureMission> findByMissionId(Long missionId);
    List<CandidatureMission> findByCandidatId(Long candidatId);
    boolean existsByMissionIdAndCandidatId(Long missionId, Long candidatId);
    void deleteAllByMissionId(Long missionId);

    @Query("""
            SELECT DISTINCT m.publiePar FROM CandidatureMission c
            JOIN c.mission m
            WHERE c.candidat.id = :freelancerId
              AND m.publiePar IS NOT NULL
              AND c.statut IN :statuses
            """)
    List<Utilisateur> findDistinctClientsForFreelancer(
            @Param("freelancerId") Long freelancerId,
            @Param("statuses") List<CandidatureStatut> statuses);

    @Query("""
            SELECT DISTINCT c.candidat FROM CandidatureMission c
            WHERE c.mission.publiePar.id = :clientId
              AND c.statut IN :statuses
            """)
    List<Utilisateur> findDistinctFreelancersForClient(
            @Param("clientId") Long clientId,
            @Param("statuses") List<CandidatureStatut> statuses);
}