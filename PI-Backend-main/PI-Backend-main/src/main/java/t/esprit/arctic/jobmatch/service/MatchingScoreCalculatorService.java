package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import t.esprit.arctic.jobmatch.dto.MatchingScoresDTO;
import t.esprit.arctic.jobmatch.entity.*;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchingScoreCalculatorService {

    /**
     * Calculate the 4 matching scores for a candidate-offre pair
     */
    public MatchingScoresDTO calculateMatchingScores(Candidat candidat, OffreEmploi offre) {
        double sSkills = calculateSkillsScore(candidat, offre);
        double sExperience = calculateExperienceScore(candidat, offre);
        double sLocation = calculateLocationScore(candidat, offre);
        double sDomain = calculateDomainScore(candidat, offre);

        // Normalize scores to 0-1 range
        sSkills = Math.max(0, Math.min(1, sSkills));
        sExperience = Math.max(0, Math.min(1, sExperience));
        sLocation = Math.max(0, Math.min(1, sLocation));
        sDomain = Math.max(0, Math.min(1, sDomain));

        return MatchingScoresDTO.builder()
                .sSkills(sSkills)
                .sExperience(sExperience)
                .sLocation(sLocation)
                .sDomain(sDomain)
                .build();
    }

    /**
     * Calculate skills match score (0-1)
     * Matches candidate competences against job required competences
     */
    private double calculateSkillsScore(Candidat candidat, OffreEmploi offre) {
        if (candidat.getCompetences() == null || candidat.getCompetences().isEmpty()) {
            return 0.0;
        }

        if (offre.getCompetencesRequises() == null || offre.getCompetencesRequises().isEmpty()) {
            return 0.0;
        }

        Set<String> candidateSkills = candidat.getCompetences().stream()
                .map(c -> c.getNom().toLowerCase().trim())
                .collect(Collectors.toSet());

        Set<String> requiredSkills = new HashSet<>(offre.getCompetencesRequises().stream()
                .map(String::toLowerCase)
                .map(String::trim)
                .collect(Collectors.toList()));

        // Calculate intersection
        Set<String> matchedSkills = candidateSkills.stream()
                .filter(requiredSkills::contains)
                .collect(Collectors.toSet());

        // Score = matched / max(candidate, required)
        int maxSkills = Math.max(candidateSkills.size(), requiredSkills.size());
        return (double) matchedSkills.size() / maxSkills;
    }

    /**
     * Calculate experience match score (0-1)
     * Compares candidate total experience vs job required experience
     */
    private double calculateExperienceScore(Candidat candidat, OffreEmploi offre) {
        double candidateExperience = getTotalExperienceYears(candidat);
        
        // Extract required experience from offre
        double requiredExperience = 0;
        if (offre.getDescription() != null) {
            // Try to extract years from description (e.g., "3 ans", "2-3 years")
            requiredExperience = extractExperienceFromText(offre.getDescription());
        }

        // If not found in description, use the job_experience field if available
        if (requiredExperience == 0 && offre.getDescription() != null) {
            try {
                requiredExperience = Double.parseDouble(offre.getDescription().split(" ")[0]);
            } catch (Exception e) {
                requiredExperience = 2.0; // Default to 2 years
            }
        }

        if (requiredExperience == 0) {
            requiredExperience = 2.0; // Default requirement
        }

        // Calculate match: 1.0 if >= required, decreases if below
        if (candidateExperience >= requiredExperience) {
            return 1.0;
        } else {
            return candidateExperience / requiredExperience;
        }
    }

    /**
     * Calculate location match score (0-1)
     * 1.0 if same location, lower if different
     */
    private double calculateLocationScore(Candidat candidat, OffreEmploi offre) {
        if (candidat.getLocalisation() == null || offre.getLocation() == null) {
            return 0.2; // Neutral score if location unknown
        }

        String candidateLocation = candidat.getLocalisation().getVille() != null 
            ? candidat.getLocalisation().getVille().toLowerCase() 
            : "";
        String jobLocation = offre.getLocation().toLowerCase();

        // Exact match
        if (candidateLocation.equals(jobLocation)) {
            return 1.0;
        }

        // Partial match (city name contains)
        if (candidateLocation.contains(jobLocation) || jobLocation.contains(candidateLocation)) {
            return 0.7;
        }

        // Same country but different city
        if (candidat.getLocalisation().getPays() != null &&
            offre.getLocation() != null &&
            candidat.getLocalisation().getPays().equals(offre.getLocation())) {
            return 0.4;
        }

        return 0.2; // Different location but open to remote
    }

    /**
     * Calculate domain/field match score (0-1)
     * Matches candidate education domain with job domain
     */
    private double calculateDomainScore(Candidat candidat, OffreEmploi offre) {
        String jobTitle = offre.getTitre().toLowerCase();
        String jobDescription = offre.getDescription() != null ? offre.getDescription().toLowerCase() : "";

        // Get candidate's education domains
        String candidateDomain = getCandidateDomain(candidat).toLowerCase();

        if (candidateDomain.isEmpty()) {
            return 0.2; // Neutral score
        }

        // Check if domain keywords match job title or description
        if (jobTitle.contains(candidateDomain) || jobDescription.contains(candidateDomain)) {
            return 1.0;
        }

        // Check for related keywords (e.g., "development" contains "developer")
        if (isSimilarDomain(candidateDomain, jobTitle) || isSimilarDomain(candidateDomain, jobDescription)) {
            return 0.7;
        }

        return 0.3; // Some relevance
    }

    /**
     * Get total experience in years from all backgrounds
     */
    private double getTotalExperienceYears(Candidat candidat) {
        if (candidat.getBackgrounds() == null || candidat.getBackgrounds().isEmpty()) {
            return 0.0;
        }

        double totalYears = 0;

        for (Background background : candidat.getBackgrounds()) {
            try {
                if (background.getStartDate() != null && background.getEndDate() != null) {
                    // Parse dates (handles both yyyy-MM-dd and yyyy formats)
                    // Use Jan 1 for start dates, Dec 31 for end dates (year-only format)
                    LocalDate startDate = parseFlexibleDate(background.getStartDate(), true);
                    LocalDate endDate = parseFlexibleDate(background.getEndDate(), false);
                    
                    if (startDate != null && endDate != null) {
                        long days = ChronoUnit.DAYS.between(startDate, endDate);
                        totalYears += days / 365.0; // Convert to years
                    }
                }
            } catch (Exception e) {
                log.warn("Error calculating experience for background: {}", e.getMessage());
            }
        }

        return totalYears;
    }

    /**
     * Parse dates in flexible format (yyyy-MM-dd or yyyy)
     * For year-only format: 
     *   - isStartDate=true: returns Jan 1 of that year
     *   - isStartDate=false: returns Dec 31 of that year
     */
    private LocalDate parseFlexibleDate(String dateStr, boolean isStartDate) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return null;
        }

        dateStr = dateStr.trim();

        try {
            // Try full date format first (yyyy-MM-dd)
            if (dateStr.contains("-") && dateStr.split("-").length >= 3) {
                return LocalDate.parse(dateStr);
            }

            // Try year-only format (yyyy)
            if (dateStr.matches("\\d{4}")) {
                int year = Integer.parseInt(dateStr);
                if (isStartDate) {
                    return LocalDate.of(year, 1, 1);  // Jan 1 for start
                } else {
                    return LocalDate.of(year, 12, 31); // Dec 31 for end
                }
            }

            // Fallback: try to parse year from mixed formats
            int year = Integer.parseInt(dateStr.replaceAll("\\D", ""));
            if (isStartDate) {
                return LocalDate.of(year, 1, 1);
            } else {
                return LocalDate.of(year, 12, 31);
            }

        } catch (Exception e) {
            log.warn("Could not parse date: {}", dateStr);
            return null;
        }
    }

    /**
     * Get candidate's primary education domain
     */
    private String getCandidateDomain(Candidat candidat) {
        if (candidat.getEducations() != null && !candidat.getEducations().isEmpty()) {
            Education firstEducation = candidat.getEducations().get(0);
            if (firstEducation != null && firstEducation.getDomain() != null) {
                return firstEducation.getDomain();
            }
        }
        return candidat.getNiveauEtude() != null ? candidat.getNiveauEtude() : "";
    }

    /**
     * Extract experience requirement from text (e.g., "3 ans d'expérience" -> 3)
     */
    private double extractExperienceFromText(String text) {
        try {
            String[] parts = text.split(" ");
            for (int i = 0; i < parts.length; i++) {
                try {
                    double num = Double.parseDouble(parts[i]);
                    if (i + 1 < parts.length && 
                        (parts[i + 1].contains("an") || parts[i + 1].contains("year") || 
                         parts[i + 1].contains("exp"))) {
                        return num;
                    }
                } catch (NumberFormatException ignored) {
                }
            }
        } catch (Exception ignored) {
        }
        return 0;
    }

    /**
     * Check if two domain strings are similar
     */
    private boolean isSimilarDomain(String domain1, String domain2) {
        String[] keywords1 = domain1.split(" ");
        String[] keywords2 = domain2.split(" ");

        for (String kw1 : keywords1) {
            for (String kw2 : keywords2) {
                if (kw1.length() > 3 && kw2.length() > 3 && 
                    (kw1.contains(kw2) || kw2.contains(kw1))) {
                    return true;
                }
            }
        }
        return false;
    }
}
