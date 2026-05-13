package t.esprit.arctic.jobmatch.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/job-matching")
public class JobMatchingController {

    @PostMapping
    public ResponseEntity<Map<String, Object>> matchOffres(@RequestBody Map<String, Object> request) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", "ML proxy désactivé dans ce déploiement");
        body.put("offres", java.util.Collections.emptyList());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }
}
