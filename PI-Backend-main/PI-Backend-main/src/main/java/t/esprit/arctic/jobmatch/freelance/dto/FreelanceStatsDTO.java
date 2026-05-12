package t.esprit.arctic.jobmatch.freelance.dto;

import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class FreelanceStatsDTO {
    // ── Freelancer KPIs ────────────────────────────
    private int totalCandidatures;
    private int acceptedCandidatures;
    private int rejectedCandidatures;
    private int pendingCandidatures;
    private int approvalPercent;       // (accepted / total) * 100
    private int freelancerPoints;      // +10 per accepted
    private String freelancerLevel;    // Débutant / Intermédiaire / Expert
    private double totalEarnings;      // sum of budgets for ACCEPTEE missions

    // ── Client KPIs ────────────────────────────────
    private int totalMissionsPosted;
    private int openMissions;
    private int totalIncomingCandidatures;
    private int pendingIncomingCandidatures;
    private double totalBudgetAllocated;

    // ── Advanced analytics ──────────────────────────
    @Builder.Default
    private List<String> monthLabels = new ArrayList<>();
    @Builder.Default
    private List<Double> monthlyRevenueSeries = new ArrayList<>();
    @Builder.Default
    private List<Integer> monthlyMissionSeries = new ArrayList<>();
    private int completionSuccessPercent;
}
