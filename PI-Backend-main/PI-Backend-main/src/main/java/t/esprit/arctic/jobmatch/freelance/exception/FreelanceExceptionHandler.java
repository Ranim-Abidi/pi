package t.esprit.arctic.jobmatch.freelance.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice(basePackages = "t.esprit.arctic.jobmatch.freelance")
public class FreelanceExceptionHandler {

    @ExceptionHandler(FreelanceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(FreelanceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("status", 404, "error", ex.getMessage()));
    }

    @ExceptionHandler(FreelanceAccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleForbidden(FreelanceAccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("status", 403, "error", ex.getMessage()));
    }

    @ExceptionHandler(FreelanceConflictException.class)
    public ResponseEntity<Map<String, Object>> handleConflict(FreelanceConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("status", 409, "error", ex.getMessage()));
    }

    @ExceptionHandler({FreelanceBadRequestException.class, IllegalArgumentException.class, IllegalStateException.class})
    public ResponseEntity<Map<String, Object>> handleBadRequest(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("status", 400, "error", ex.getMessage()));
    }
}
