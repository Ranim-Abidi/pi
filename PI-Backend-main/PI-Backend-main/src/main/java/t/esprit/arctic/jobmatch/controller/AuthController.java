package t.esprit.arctic.jobmatch.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import t.esprit.arctic.jobmatch.dto.LoginRequest;
import t.esprit.arctic.jobmatch.dto.RegisterRequest;
import t.esprit.arctic.jobmatch.dto.LoginResponse;
import t.esprit.arctic.jobmatch.dto.RegisterResponse;
import t.esprit.arctic.jobmatch.dto.PasswordResetRequest;
import t.esprit.arctic.jobmatch.dto.VerifyOtpRequest;
import t.esprit.arctic.jobmatch.dto.PasswordResetResponse;
import t.esprit.arctic.jobmatch.dto.ProfileCompletenessDto;
import t.esprit.arctic.jobmatch.entity.*;
import t.esprit.arctic.jobmatch.security.JwtService;
import t.esprit.arctic.jobmatch.service.UtilisateurService;
import t.esprit.arctic.jobmatch.service.TwilioService;
import t.esprit.arctic.jobmatch.service.LoginHistoryService;
import t.esprit.arctic.jobmatch.service.NotificationService;
import t.esprit.arctic.jobmatch.service.ProfileCheckService;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UtilisateurService service;
    private final AuthenticationManager authManager;
    private final JwtService jwtService;
    private final TwilioService twilioService;
    private final LoginHistoryService loginHistoryService;
    private final NotificationService notificationService;
    private final ProfileCheckService profileCheckService;

    //  REGISTER
    @PostMapping("/register")
    public RegisterResponse register(@RequestBody RegisterRequest request) {
        Role resolvedRole = request.role;
        if (resolvedRole == null && request.roleString != null) {
            String normalized = request.roleString.trim().toUpperCase().replace("ROLE_", "");
            try {
                resolvedRole = Role.valueOf(normalized);
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException("Role invalide: " + request.roleString);
            }
        }

        if (resolvedRole == null) {
            throw new IllegalArgumentException("Role requis pour l'inscription");
        }

        Utilisateur user;
        switch (resolvedRole) {
            case CANDIDAT:
                Candidat candidat = new Candidat();
                candidat.setPrenom(request.prenom != null ? request.prenom : "");
                candidat.setTelephone(request.telephone != null ? request.telephone : "");
                candidat.setNiveauEtude(request.niveauEtude != null ? request.niveauEtude : "");
                candidat.setCv(request.cv);
                candidat.setLienPortfolio(request.lienPortfolio);
                candidat.setDescription(request.description);
                user = candidat;
                break;
            case RECRUTEUR:
                Recruteur recruteur = new Recruteur();
                recruteur.setEntreprise(request.entreprise);
                recruteur.setPoste(request.poste);
                recruteur.setSecteur(request.secteur);
                user = recruteur;
                break;

            case ORGANISATEUR:
                OrganisateurEvenement organisateur = new OrganisateurEvenement();
                organisateur.setOrganisation(request.organisation);
                organisateur.setAdresse(request.adresse);
                organisateur.setDescriptionProjet(request.descriptionProjet);
                user = organisateur;
                break;
            default:
                user = new Utilisateur();
                break;
        }
        user.setNom(request.nom);
        user.setEmail(request.email);
        user.setMotDePasse(request.motDePasse);
        user.setRole(resolvedRole);
        user.setActif(true);
        user.setDateCreation(java.time.LocalDateTime.now());

        Utilisateur savedUser = service.register(user);
        
        return new RegisterResponse(
                savedUser.getId(),
                savedUser.getNom(),
                savedUser.getEmail(),
                savedUser.getRole().toString(),
                "Inscription réussie"
        );
    }

    // LOGIN
    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        try {
            if (request.email == null || request.email.trim().isEmpty()) {
                throw new BadCredentialsException("Email requis");
            }
            if (request.motDePasse == null || request.motDePasse.isEmpty()) {
                throw new BadCredentialsException("Mot de passe requis");
            }

            authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.email,
                            request.motDePasse
                    )
            );

            String token = jwtService.generateToken(request.email);
            if (token == null || token.isEmpty()) {
                throw new RuntimeException("Token JWT non généré");
            }
            
            String role = jwtService.extractRole(token);
            
            String ipAddress = getClientIpAddress(httpRequest);
            String userAgent = httpRequest.getHeader("User-Agent");
            loginHistoryService.recordLoginByEmail(request.email, ipAddress, userAgent);
            
            try {
                long connectionCount = loginHistoryService.countConnectionsByEmail(request.email);
                
                if (connectionCount >= 2 && role.equals("CANDIDAT")) {
                    Utilisateur user = service.getByEmail(request.email);
                    if (user instanceof Candidat) {
                        ProfileCompletenessDto profile = profileCheckService.checkProfileCompleteness(user.getId());
                        if (!profile.isComplete()) {
                            notificationService.sendProfileIncompleteNotification(user.getId(), profile.getMissingFields());
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Error: Profile check notification failed: " + e.getMessage());
            }
            
            return new LoginResponse(token, request.email, role, "Connexion réussie");
        } catch (BadCredentialsException ex) {
            throw new BadCredentialsException("Email ou mot de passe incorrect");
        } catch (Exception ex) {
            System.err.println("Erreur login: " + ex.getMessage());
            ex.printStackTrace();
            throw new RuntimeException("Erreur lors de la connexion: " + ex.getMessage());
        }
    }

    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }

    //  TEST ROLE (DEBUG)
    @GetMapping("/test-role")
    public String testRole(Authentication auth) {

        if (auth == null) {
            return "No authentication";
        }

        return auth.getAuthorities().toString();
    }

    //  ENDPOINT DE TEST JWT
    @PostMapping("/test-jwt")
    public java.util.Map<String, Object> testJwt(@RequestBody LoginRequest request) {
        try {
            String token = jwtService.generateToken(request.email);
            String email = jwtService.extractEmail(token);
            String role = jwtService.extractRole(token);
            
            return java.util.Map.of(
                    "token", token,
                    "email", email,
                    "role", role,
                    "message", "JWT généré avec succès"
            );
        } catch (Exception ex) {
            return java.util.Map.of(
                    "error", ex.getMessage()
            );
        }
    }

    //  ENDPOINT DE TEST AUTHENTIFICATION
    @GetMapping("/test-auth")
    public java.util.Map<String, Object> testAuth(Authentication auth) {
        if (auth == null) {
            return java.util.Map.of(
                    "authenticated", false,
                    "message", "Aucune authentification"
            );
        }

        return java.util.Map.of(
                "authenticated", true,
                "principal", auth.getPrincipal().toString(),
                "authorities", auth.getAuthorities().toString(),
                "name", auth.getName(),
                "message", "Authentification valide"
        );
    }

    // ─── PASSWORD RESET ENDPOINT ───────────────────────────────────────────
    // Password reset: Find user by phone, generate new password, send via SMS, update database
    @PostMapping("/reset-password")
    public PasswordResetResponse requestPasswordReset(@RequestBody PasswordResetRequest request) {
        try {
            String phoneNumber = request.getPhoneNumber();
            System.out.println("[PASSWORD RESET] Received phone: " + phoneNumber);
            
            if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
                return new PasswordResetResponse(false, "Numéro de téléphone requis", "ERROR");
            }

            // Generate new password and send via SMS
            String newPassword = twilioService.sendNewPasswordBySMS(phoneNumber);

            // Update password in database
            service.resetPasswordByPhone(phoneNumber, newPassword);

            System.out.println("[PASSWORD RESET] Password reset successful for phone: " + phoneNumber);
            return new PasswordResetResponse(true, "Nouveau mot de passe envoyé au numéro fourni. Vérifiez vos SMS.", "SUCCESS");
        } catch (Exception e) {
            System.err.println("[PASSWORD RESET] Error: " + e.getMessage());
            e.printStackTrace();
            return new PasswordResetResponse(false, "Erreur: " + e.getMessage(), "ERROR");
        }
    }

    @PostMapping("/change-password")
    public java.util.Map<String, Object> changePassword(@RequestBody java.util.Map<String, String> request) {
        try {
            Long userId = Long.valueOf(request.get("userId"));
            String oldPassword = request.get("oldPassword");
            String newPassword = request.get("newPassword");

            if (userId == null || oldPassword == null || newPassword == null) {
                return java.util.Map.of(
                    "success", false,
                    "message", "Missing required fields"
                );
            }

            service.changePassword(userId, oldPassword, newPassword);
            
            return java.util.Map.of(
                "success", true,
                "message", "Password changed successfully"
            );
        } catch (Exception e) {
            return java.util.Map.of(
                "success", false,
                "message", e.getMessage()
            );
        }
    }
}
