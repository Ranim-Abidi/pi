// JobMatchingController.java
package t.esprit.arctic.jobmatch.controller;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.util.Map;

@RestController
@RequestMapping("/api/job-matching")
public class JobMatchingController {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String ML_URL = "http://localhost:8000/matching/offres";

    @PostMapping
    public ResponseEntity<Map> matchOffres(@RequestBody Map<String, Object> request) {
        try {
            System.out.println("📤 [Spring] Forwarding to ML: " + request);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    ML_URL,
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            System.out.println("📥 [Spring] ML response: " + response.getBody());
            return ResponseEntity.ok(response.getBody());

        } catch (Exception e) {
            System.err.println("❌ [Spring] Error: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
