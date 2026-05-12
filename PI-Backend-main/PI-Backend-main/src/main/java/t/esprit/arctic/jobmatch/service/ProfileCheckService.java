package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import t.esprit.arctic.jobmatch.dto.ProfileCompletenessDto;
import t.esprit.arctic.jobmatch.entity.Candidat;
import t.esprit.arctic.jobmatch.repository.CandidatRepository;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ProfileCheckService {

    private final CandidatRepository candidatRepository;

    @Transactional
    public ProfileCompletenessDto checkProfileCompleteness(Long candidatId) {
        Candidat candidat = candidatRepository.findById(candidatId)
                .map(u -> (Candidat) u)
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        ProfileCompletenessDto dto = new ProfileCompletenessDto();
        dto.setCandidatId(candidat.getId());
        dto.setEmail(candidat.getEmail());
        dto.setNom(candidat.getNom());

        List<String> missingFields = new ArrayList<>();

        boolean hasTelephone = candidat.getTelephone() != null && !candidat.getTelephone().trim().isEmpty();
        dto.setHasTelephone(hasTelephone);
        if (!hasTelephone) missingFields.add("Phone Number");

        boolean hasDescription = candidat.getDescription() != null && !candidat.getDescription().trim().isEmpty();
        dto.setHasDescription(hasDescription);
        if (!hasDescription) missingFields.add("Description");

        boolean hasLocalisation = candidat.getLocalisation() != null;
        dto.setHasLocalisation(hasLocalisation);
        if (!hasLocalisation) missingFields.add("Localisation");

        boolean hasEducationLevel = candidat.getNiveauEtude() != null && !candidat.getNiveauEtude().trim().isEmpty();
        dto.setHasEducation(hasEducationLevel);
        if (!hasEducationLevel) missingFields.add("Education Level");

        int totalFields = 4;
        int completedFields = 0;
        if (hasTelephone) completedFields++;
        if (hasDescription) completedFields++;
        if (hasLocalisation) completedFields++;
        if (hasEducationLevel) completedFields++;

        dto.setCompletenessPercentage((completedFields * 100) / totalFields);
        dto.setMissingFields(String.join(", ", missingFields));
        dto.setComplete(missingFields.isEmpty());

        return dto;
    }
}
