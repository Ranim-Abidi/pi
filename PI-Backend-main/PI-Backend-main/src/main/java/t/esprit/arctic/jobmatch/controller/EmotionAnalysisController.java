package t.esprit.arctic.jobmatch.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.dto.EmotionAnalysisDTO;
import t.esprit.arctic.jobmatch.dto.EmotionFrameDTO;
import t.esprit.arctic.jobmatch.dto.ProcessEmotionFrameRequest;
import t.esprit.arctic.jobmatch.service.EmotionAnalysisService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/interviews/{entretienId}/emotion-analysis")
public class EmotionAnalysisController {

    @Autowired
    private EmotionAnalysisService emotionAnalysisService;

    /**
     * Start emotion analysis for an interview
     * POST /api/interviews/{entretienId}/emotion-analysis/start
     */
    @PostMapping("/start")
    public ResponseEntity<Map<String, Object>> startEmotionAnalysis(
            @PathVariable Long entretienId) {
        try {
            EmotionAnalysisDTO analysis = emotionAnalysisService.startEmotionAnalysis(entretienId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Emotion analysis started successfully");
            response.put("data", analysis);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return buildErrorResponse(400, "Error starting emotion analysis: " + e.getMessage());
        }
    }

    /**
     * Process a single emotion frame
     * POST /api/interviews/{entretienId}/emotion-analysis/process-frame
     */
    @PostMapping("/process-frame")
    public ResponseEntity<Map<String, Object>> processEmotionFrame(
            @PathVariable Long entretienId,
            @RequestBody ProcessEmotionFrameRequest request) {
        try {
            EmotionFrameDTO frameDTO = emotionAnalysisService.processEmotionFrame(entretienId, request);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Frame processed successfully");
            response.put("data", frameDTO);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return buildErrorResponse(400, "Error processing emotion frame: " + e.getMessage());
        }
    }

    /**
     * Get current emotion analysis results
     * GET /api/interviews/{entretienId}/emotion-analysis
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getEmotionAnalysis(
            @PathVariable Long entretienId) {
        try {
            EmotionAnalysisDTO analysis = emotionAnalysisService.getEmotionAnalysis(entretienId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", analysis);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return buildErrorResponse(404, "Emotion analysis not found: " + e.getMessage());
        }
    }

    /**
     * Get all emotion frames for an analysis
     * GET /api/interviews/{entretienId}/emotion-analysis/frames
     */
    @GetMapping("/frames")
    public ResponseEntity<Map<String, Object>> getEmotionFrames(
            @PathVariable Long entretienId) {
        try {
            List<EmotionFrameDTO> frames = emotionAnalysisService.getEmotionFrames(entretienId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", frames);
            response.put("count", frames.size());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return buildErrorResponse(404, "Emotion frames not found: " + e.getMessage());
        }
    }

    /**
     * Complete emotion analysis and generate assessment
     * POST /api/interviews/{entretienId}/emotion-analysis/complete
     */
    @PostMapping("/complete")
    public ResponseEntity<Map<String, Object>> completeEmotionAnalysis(
            @PathVariable Long entretienId) {
        try {
            EmotionAnalysisDTO analysis = emotionAnalysisService.completeEmotionAnalysis(entretienId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Emotion analysis completed");
            response.put("data", analysis);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return buildErrorResponse(400, "Error completing emotion analysis: " + e.getMessage());
        }
    }

    /**
     * Helper method to build error responses
     */
    private ResponseEntity<Map<String, Object>> buildErrorResponse(int statusCode, String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", message);

        return ResponseEntity.status(statusCode).body(response);
    }
}
