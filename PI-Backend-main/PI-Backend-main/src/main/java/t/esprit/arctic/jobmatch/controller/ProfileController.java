package t.esprit.arctic.jobmatch.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.dto.ProfileCompletenessDto;
import t.esprit.arctic.jobmatch.service.ProfileCheckService;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileCheckService profileCheckService;

    @GetMapping("/completeness/{userId}")
    @Transactional
    public ProfileCompletenessDto getProfileCompleteness(@PathVariable Long userId) {
        return profileCheckService.checkProfileCompleteness(userId);
    }
}
