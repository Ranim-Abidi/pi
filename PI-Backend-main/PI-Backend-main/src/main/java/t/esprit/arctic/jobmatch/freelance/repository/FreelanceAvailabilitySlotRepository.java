package t.esprit.arctic.jobmatch.freelance.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import t.esprit.arctic.jobmatch.freelance.entity.FreelanceAvailabilitySlot;

import java.time.LocalDateTime;
import java.util.List;

public interface FreelanceAvailabilitySlotRepository extends JpaRepository<FreelanceAvailabilitySlot, Long> {

    List<FreelanceAvailabilitySlot> findByFreelancerIdOrderByStartDateAsc(Long freelancerId);

    @Query("""
            SELECT s FROM FreelanceAvailabilitySlot s
            WHERE s.freelancer.id = :freelancerId
              AND s.booked = false
              AND s.startDate <= :start
              AND s.endDate >= :end
            ORDER BY s.startDate ASC
            """)
    List<FreelanceAvailabilitySlot> findBookableSlots(@Param("freelancerId") Long freelancerId,
                                                      @Param("start") LocalDateTime start,
                                                      @Param("end") LocalDateTime end);

    @Query("""
            SELECT s FROM FreelanceAvailabilitySlot s
            WHERE s.freelancer.id = :freelancerId
              AND (:excludeId IS NULL OR s.id <> :excludeId)
              AND s.startDate < :endDate
              AND s.endDate > :startDate
            """)
    List<FreelanceAvailabilitySlot> findOverlaps(@Param("freelancerId") Long freelancerId,
                                                 @Param("startDate") LocalDateTime startDate,
                                                 @Param("endDate") LocalDateTime endDate,
                                                 @Param("excludeId") Long excludeId);
}
