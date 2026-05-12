package t.esprit.arctic.jobmatch.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.entity.Utilisateur;
import t.esprit.arctic.jobmatch.service.UtilisateurService;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UtilisateurService service;

    @GetMapping
    public List<Utilisateur> getAll() {
        return service.getAll();
    }

    @GetMapping("/{id}")
    public Utilisateur getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @PostMapping
    public Utilisateur create(@RequestBody Utilisateur user) {
        return service.register(user);
    }

    @PutMapping("/{id}")
    public Utilisateur update(@PathVariable Long id, @RequestBody Utilisateur user) {
        return service.update(id, user);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    /**
     * Delete account endpoint - removes user, candidat, and location data
     */
    @DeleteMapping("/{id}/delete-account")
    public ResponseEntity<?> deleteAccount(@PathVariable Long id) {
        try {
            service.deleteAccount(id);
            return ResponseEntity.ok(new DeleteAccountResponse("Compte supprimé avec succès", true));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new DeleteAccountResponse("Erreur lors de la suppression: " + e.getMessage(), false));
        }
    }




    // Inner DTO for delete account response
    public static class DeleteAccountResponse {
        public String message;
        public boolean success;

        public DeleteAccountResponse(String message, boolean success) {
            this.message = message;
            this.success = success;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }

        public boolean isSuccess() {
            return success;
        }

        public void setSuccess(boolean success) {
            this.success = success;
        }
    }
}