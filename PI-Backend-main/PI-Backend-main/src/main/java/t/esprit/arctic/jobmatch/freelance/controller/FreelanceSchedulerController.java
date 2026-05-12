package t.esprit.arctic.jobmatch.freelance.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.freelance.dto.AutoBookRequest;
import t.esprit.arctic.jobmatch.freelance.dto.AvailabilitySlotDTO;
import t.esprit.arctic.jobmatch.freelance.dto.CreateAvailabilitySlotRequest;
import t.esprit.arctic.jobmatch.freelance.dto.CreateEventRequest;
import t.esprit.arctic.jobmatch.freelance.dto.DeadlineItemDTO;
import t.esprit.arctic.jobmatch.freelance.dto.FreelanceEventDTO;
import t.esprit.arctic.jobmatch.freelance.dto.SchedulerUserOptionDTO;
import t.esprit.arctic.jobmatch.freelance.service.FreelanceSchedulerService;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/freelance/scheduler")
@RequiredArgsConstructor
public class FreelanceSchedulerController {

    private final FreelanceSchedulerService schedulerService;

    /** Get all events for current user */
    @GetMapping("/events")
    public ResponseEntity<List<FreelanceEventDTO>> getMyEvents(Principal principal) {
        return ResponseEntity.ok(schedulerService.getMyEvents(principal.getName()));
    }

    /** Get events in a date range */
    @GetMapping("/events/range")
    public ResponseEntity<List<FreelanceEventDTO>> getEventsByRange(
            Principal principal,
            @RequestParam String start,
            @RequestParam String end) {
        return ResponseEntity.ok(schedulerService.getMyEventsByRange(
                principal.getName(),
                LocalDateTime.parse(start),
                LocalDateTime.parse(end)
        ));
    }

    /** Linked users (clients or freelancers) that can be invited on a shared calendar event */
    @GetMapping("/counterparties")
    public ResponseEntity<List<SchedulerUserOptionDTO>> getCounterparties(
            Principal principal,
            @RequestParam(required = false) String view) {
        return ResponseEntity.ok(schedulerService.getCalendarCounterparties(principal.getName(), view));
    }

    /** Create a new event */
    @PostMapping("/events")
    public ResponseEntity<FreelanceEventDTO> createEvent(
            Principal principal,
            @RequestBody CreateEventRequest req) {
        return ResponseEntity.ok(schedulerService.createEvent(principal.getName(), req));
    }

    /** Update an event */
    @PutMapping("/events/{id}")
    public ResponseEntity<FreelanceEventDTO> updateEvent(
            @PathVariable Long id,
            Principal principal,
            @RequestBody CreateEventRequest req) {
        return ResponseEntity.ok(schedulerService.updateEvent(id, principal.getName(), req));
    }

    /** Change event status (CONFIRMED, CANCELLED, COMPLETED) */
    @PatchMapping("/events/{id}/status")
    public ResponseEntity<FreelanceEventDTO> updateStatus(
            @PathVariable Long id,
            Principal principal,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(schedulerService.updateStatus(id, principal.getName(), body.get("status")));
    }

    /** PUT alias for status updates (compatibility) */
    @PutMapping("/events/{id}/status")
    public ResponseEntity<FreelanceEventDTO> updateStatusPut(
            @PathVariable Long id,
            Principal principal,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(schedulerService.updateStatus(id, principal.getName(), body.get("status")));
    }

    /** Delete event */
    @DeleteMapping("/events/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id, Principal principal) {
        schedulerService.deleteEvent(id, principal.getName());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/availability")
    public ResponseEntity<List<AvailabilitySlotDTO>> getMyAvailability(Principal principal) {
        return ResponseEntity.ok(schedulerService.getMyAvailability(principal.getName()));
    }

    @PostMapping("/availability")
    public ResponseEntity<AvailabilitySlotDTO> createAvailability(Principal principal,
                                                                  @RequestBody CreateAvailabilitySlotRequest req) {
        return ResponseEntity.ok(schedulerService.createAvailabilitySlot(principal.getName(), req));
    }

    @DeleteMapping("/availability/{id}")
    public ResponseEntity<Void> deleteAvailability(@PathVariable Long id, Principal principal) {
        schedulerService.deleteAvailabilitySlot(id, principal.getName());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bookings/auto")
    public ResponseEntity<FreelanceEventDTO> autoBook(Principal principal, @RequestBody AutoBookRequest req) {
        return ResponseEntity.ok(schedulerService.autoBook(principal.getName(), req));
    }

    @GetMapping("/deadlines/upcoming")
    public ResponseEntity<List<DeadlineItemDTO>> upcomingDeadlines(Principal principal,
                                                                   @RequestParam(defaultValue = "14") int days) {
        return ResponseEntity.ok(schedulerService.getUpcomingDeadlines(principal.getName(), days));
    }
}
