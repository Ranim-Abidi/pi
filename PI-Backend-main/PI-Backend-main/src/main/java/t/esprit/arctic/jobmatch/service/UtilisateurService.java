package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import t.esprit.arctic.jobmatch.entity.Candidat;
import t.esprit.arctic.jobmatch.entity.Recruteur;
import t.esprit.arctic.jobmatch.entity.Utilisateur;
import t.esprit.arctic.jobmatch.repository.CandidatRepository;
import t.esprit.arctic.jobmatch.repository.LocalisationRepository;
import t.esprit.arctic.jobmatch.repository.RechercheHistoriqueRepository;
import t.esprit.arctic.jobmatch.repository.UtilisateurRepository;
import jakarta.persistence.EntityManager;

import java.util.List;
import java.util.stream.Collectors;

import t.esprit.arctic.jobmatch.dto.UtilisateurSearchDto;

@Service
@RequiredArgsConstructor
public class UtilisateurService {

    private final UtilisateurRepository repository;
    private final CandidatRepository candidatRepository;
    private final LocalisationRepository localisationRepository;
    private final RechercheHistoriqueRepository rechercheHistoriqueRepository;
    private final EntityManager entityManager;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;

    public Utilisateur register(Utilisateur user) {
        if (repository.findByEmail(user.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Un compte avec cet email existe déjà");
        }
        user.setMotDePasse(passwordEncoder.encode(user.getMotDePasse()));
        Utilisateur savedUser = repository.save(user);
        
        // If recruiter joined, notify all candidates
        if (user instanceof Recruteur) {
            try {
                Recruteur recruteur = (Recruteur) user;
                notificationService.notifyAllCandidatesOfNewRecruiter(
                    recruteur.getId(),
                    recruteur.getNom(),
                    recruteur.getEntreprise()
                );
            } catch (Exception e) {
                System.err.println("Error notifying candidates of new recruiter: " + e.getMessage());
            }
        }
        
        return savedUser;
    }

    @Transactional(readOnly = true)
    public List<Utilisateur> getAll() {
        return repository.findAll();
    }

    public List<UtilisateurSearchDto> searchByName(String name) {
        if (name == null || name.trim().isEmpty()) {
            return List.of();
        }

        return repository.findByNomContainingIgnoreCase(name.trim())
                .stream()
                .map(user -> new UtilisateurSearchDto(
                        user.getId(),
                        user.getNom(),
                        user.getEmail(),
                        user.getRole() == null ? null : user.getRole().name()
                ))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Utilisateur getById(Long id) {
        return repository.findById(id).orElseThrow();
    }

    public Utilisateur getByEmail(String email) {
        return repository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'email: " + email));
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }

    /**
     * Delete account for a user with proper cascade handling
     */
    @Transactional
    public void deleteAccount(Long userId) {
        Utilisateur user = repository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'id: " + userId));

        if (user instanceof Candidat) {
            Candidat candidat = (Candidat) user;
            
            if (candidat.getLocalisation() != null) {
                Long localisationId = candidat.getLocalisation().getId();
                candidat.setLocalisation(null);
                candidatRepository.save(candidat);
                try {
                    localisationRepository.deleteById(localisationId);
                } catch (Exception e) {
                    throw new RuntimeException("Erreur lors de la suppression de la localisation: " + e.getMessage());
                }
            }
        }

        if (user instanceof Candidat) {
            try {
                candidatRepository.deleteById(userId);
            } catch (Exception e) {
                throw new RuntimeException("Erreur lors de la suppression du candidat: " + e.getMessage());
            }
        }

        try {
            repository.deleteById(userId);
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la suppression du compte: " + e.getMessage());
        }
    }

    public Utilisateur update(Long id, Utilisateur updatedUser) {
        Utilisateur user = getById(id);
        
        if (!user.getEmail().equals(updatedUser.getEmail()) && repository.findByEmail(updatedUser.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Un compte avec cet email existe déjà");
        }
        
        user.setNom(updatedUser.getNom());
        user.setEmail(updatedUser.getEmail());
        if (updatedUser.getMotDePasse() != null && !updatedUser.getMotDePasse().isEmpty()) {
            user.setMotDePasse(passwordEncoder.encode(updatedUser.getMotDePasse()));
        }
        user.setRole(updatedUser.getRole());
        return repository.save(user);
    }

    // Reset password by phone number
    public void resetPasswordByPhone(String phoneNumber, String newPassword) {
        Utilisateur user = repository.findByPhoneNumber(phoneNumber)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec le numéro: " + phoneNumber));
        
        user.setMotDePasse(passwordEncoder.encode(newPassword));
        repository.save(user);
    }

    public void changePassword(Long userId, String oldPassword, String newPassword) {
        Utilisateur user = repository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'id: " + userId));
        
        if (!passwordEncoder.matches(oldPassword, user.getMotDePasse())) {
            throw new RuntimeException("Old password is incorrect");
        }

        user.setMotDePasse(passwordEncoder.encode(newPassword));
        repository.save(user);
    }

    
}