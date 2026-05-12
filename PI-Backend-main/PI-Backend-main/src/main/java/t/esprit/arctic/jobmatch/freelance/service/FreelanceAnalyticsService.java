package t.esprit.arctic.jobmatch.freelance.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import t.esprit.arctic.jobmatch.entity.Utilisateur;
import t.esprit.arctic.jobmatch.freelance.dto.FreelanceStatsDTO;
import t.esprit.arctic.jobmatch.freelance.entity.CandidatureMission;
import t.esprit.arctic.jobmatch.freelance.entity.CandidatureStatut;
import t.esprit.arctic.jobmatch.freelance.entity.FreelancePayment;
import t.esprit.arctic.jobmatch.freelance.entity.Mission;
import t.esprit.arctic.jobmatch.freelance.entity.MissionStatut;
import t.esprit.arctic.jobmatch.freelance.entity.PaymentStatus;
import t.esprit.arctic.jobmatch.freelance.exception.FreelanceNotFoundException;
import t.esprit.arctic.jobmatch.freelance.repository.CandidatureMissionRepository;
import t.esprit.arctic.jobmatch.freelance.repository.FreelancePaymentRepository;
import t.esprit.arctic.jobmatch.freelance.repository.MissionRepository;
import t.esprit.arctic.jobmatch.repository.UtilisateurRepository;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Analytics service computing live KPI data for both freelancer and client dashboards.
 */
@Service
@RequiredArgsConstructor
public class FreelanceAnalyticsService {

    private final CandidatureMissionRepository candidatureRepository;
    private final MissionRepository missionRepository;
    private final FreelancePaymentRepository paymentRepository;
    private final UtilisateurRepository utilisateurRepository;

    // ────────────────────────────────────────────────────────────────────
    //  Freelancer Stats
    // ────────────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public FreelanceStatsDTO getFreelancerStats(String email) {
        Utilisateur user = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new FreelanceNotFoundException("Utilisateur introuvable : " + email));

        List<CandidatureMission> candidatures = candidatureRepository.findByCandidatId(user.getId());

        int total = candidatures.size();
        int accepted = (int) candidatures.stream()
                .filter(c -> c.getStatut() == CandidatureStatut.ACCEPTEE).count();
        int rejected = (int) candidatures.stream()
                .filter(c -> c.getStatut() == CandidatureStatut.REJETEE).count();
        int pending = (int) candidatures.stream()
                .filter(c -> c.getStatut() == CandidatureStatut.EN_ATTENTE).count();

        int approvalPercent = total > 0 ? (int) Math.round((accepted * 100.0) / total) : 0;
        int points = accepted * 10;

        String level;
        if (points >= 100) level = "Expert";
        else if (points >= 40) level = "Intermédiaire";
        else level = "Débutant";

        List<FreelancePayment> payments = paymentRepository.findByFreelancerId(user.getId());
        // Earnings = sum of released payments
        double earnings = payments.stream()
                .filter(p -> p.getStatus() == PaymentStatus.RELEASED)
                .mapToDouble(p -> p.getAmount() != null ? p.getAmount() : 0)
                .sum();
        int completed = (int) candidatures.stream()
                .filter(c -> c.getMission() != null && c.getMission().getStatut() == MissionStatut.FERMEE)
                .count();
        int successPercent = accepted > 0 ? (int) Math.round((completed * 100.0) / accepted) : 0;
        TrendData freelancerTrend = buildTrendDataFromFreelancer(payments, candidatures);

        return FreelanceStatsDTO.builder()
                .totalCandidatures(total)
                .acceptedCandidatures(accepted)
                .rejectedCandidatures(rejected)
                .pendingCandidatures(pending)
                .approvalPercent(approvalPercent)
                .freelancerPoints(points)
                .freelancerLevel(level)
                .totalEarnings(earnings)
                .completionSuccessPercent(successPercent)
                .monthLabels(freelancerTrend.monthLabels)
                .monthlyRevenueSeries(freelancerTrend.revenueSeries)
                .monthlyMissionSeries(freelancerTrend.missionSeries)
                .build();
    }

    // ────────────────────────────────────────────────────────────────────
    //  Client Stats
    // ────────────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public FreelanceStatsDTO getClientStats(String email) {
        Utilisateur user = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new FreelanceNotFoundException("Utilisateur introuvable : " + email));

        List<Mission> missions = missionRepository.findByPublieParId(user.getId());

        int totalMissions = missions.size();
        int openMissions = (int) missions.stream()
                .filter(m -> m.getStatut() == MissionStatut.OUVERTE).count();

        // Aggregate candidatures across all owned missions
        int totalIncoming = 0;
        int pendingIncoming = 0;
        for (Mission m : missions) {
            List<CandidatureMission> candidatures = candidatureRepository.findByMissionId(m.getId());
            totalIncoming += candidatures.size();
            pendingIncoming += candidatures.stream()
                    .filter(c -> c.getStatut() == CandidatureStatut.EN_ATTENTE).count();
        }

        double totalBudget = missions.stream()
                .mapToDouble(m -> m.getBudget() != null ? m.getBudget() : 0)
                .sum();
        List<FreelancePayment> payments = paymentRepository.findByClientId(user.getId());
        TrendData clientTrend = buildTrendDataFromClient(payments, missions);
        int completedMissions = (int) missions.stream().filter(m -> m.getStatut() == MissionStatut.FERMEE).count();
        int completionSuccessPercent = totalMissions > 0 ? (int) Math.round((completedMissions * 100.0) / totalMissions) : 0;

        return FreelanceStatsDTO.builder()
                .totalMissionsPosted(totalMissions)
                .openMissions(openMissions)
                .totalIncomingCandidatures(totalIncoming)
                .pendingIncomingCandidatures(pendingIncoming)
                .totalBudgetAllocated(totalBudget)
                .completionSuccessPercent(completionSuccessPercent)
                .monthLabels(clientTrend.monthLabels)
                .monthlyRevenueSeries(clientTrend.revenueSeries)
                .monthlyMissionSeries(clientTrend.missionSeries)
                .build();
    }

    private TrendData buildTrendDataFromFreelancer(List<FreelancePayment> payments, List<CandidatureMission> candidatures) {
        return buildTrendData(
                payments,
                candidatures.stream()
                        .filter(c -> c.getStatut() == CandidatureStatut.ACCEPTEE)
                        .map(c -> c.getDatePostulation() != null ? c.getDatePostulation() : LocalDateTime.now())
                        .toList()
        );
    }

    private TrendData buildTrendDataFromClient(List<FreelancePayment> payments, List<Mission> missions) {
        return buildTrendData(
                payments,
                missions.stream()
                        .map(m -> m.getDateCreation() != null ? m.getDateCreation() : LocalDateTime.now())
                        .toList()
        );
    }

    private TrendData buildTrendData(List<FreelancePayment> payments, List<LocalDateTime> missionDates) {
        List<String> monthLabels = new ArrayList<>();
        List<Double> revenueSeries = new ArrayList<>();
        List<Integer> missionSeries = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM yy", Locale.FRANCE);

        for (int i = 5; i >= 0; i--) {
            YearMonth ym = YearMonth.now().minusMonths(i);
            monthLabels.add(ym.atDay(1).format(formatter));
            double revenue = payments.stream()
                    .filter(p -> p.getReleasedAt() != null)
                    .filter(p -> YearMonth.from(p.getReleasedAt()).equals(ym))
                    .mapToDouble(p -> p.getAmount() != null ? p.getAmount() : 0)
                    .sum();
            int missions = (int) missionDates.stream()
                    .filter(d -> d != null && YearMonth.from(d).equals(ym))
                    .count();
            revenueSeries.add(revenue);
            missionSeries.add(missions);
        }
        return new TrendData(monthLabels, revenueSeries, missionSeries);
    }

    private record TrendData(List<String> monthLabels, List<Double> revenueSeries, List<Integer> missionSeries) {}
}
