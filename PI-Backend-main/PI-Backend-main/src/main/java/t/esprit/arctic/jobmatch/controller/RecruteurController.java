package t.esprit.arctic.jobmatch.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.entity.Recruteur;
import t.esprit.arctic.jobmatch.entity.Utilisateur;
import t.esprit.arctic.jobmatch.repository.UtilisateurRepository;
import t.esprit.arctic.jobmatch.security.JwtService;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/recruteur")
public class RecruteurController {

    @Autowired
    private UtilisateurRepository utilisateurRepository;

    @Autowired
    private JwtService jwtService;

    @GetMapping("/test")
    public String test() {
        return "RECRUTEUR OK";
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentRecruteur(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = null;
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            }

            if (token == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Token manquant"));
            }

            // Extraire l'email du token
            String email = jwtService.extractEmail(token);
            
            // Récupérer l'utilisateur
            Utilisateur user = utilisateurRepository.findByEmail(email)
                    .orElse(null);

            if (user == null) {
                return ResponseEntity.status(404).body(Map.of("error", "Utilisateur non trouvé"));
            }

            // Retourner les infos du recruteur avec son ID
            Map<String, Object> response = new HashMap<>();
            response.put("id", user.getId());
            response.put("email", user.getEmail());
            response.put("nom", user.getNom());
            response.put("role", user.getRole());

            if (user instanceof Recruteur) {
                Recruteur recruteur = (Recruteur) user;
                response.put("entreprise", recruteur.getEntreprise());
                response.put("poste", recruteur.getPoste());
                response.put("secteur", recruteur.getSecteur());
            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Token invalide", "details", e.getMessage()));
        }
    }
}

