package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import t.esprit.arctic.jobmatch.dto.UtilisateurSearchDto;
import t.esprit.arctic.jobmatch.entity.Utilisateur;
import t.esprit.arctic.jobmatch.repository.UtilisateurRepository;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SearchService {

    private final UtilisateurRepository utilisateurRepository;

    public List<UtilisateurSearchDto> searchUsersByName(String name) {
        try {
            if (name == null || name.trim().isEmpty()) {
                System.out.println("❌ Search query is null or empty");
                return Collections.emptyList();
            }

            System.out.println("🔍 Searching for users with nom containing: " + name);
            List<Utilisateur> users = utilisateurRepository.findByNomContainingIgnoreCase(name.trim());
            System.out.println("✅ Found " + users.size() + " users");

            List<UtilisateurSearchDto> result = users.stream()
                    .filter(user -> {
                        boolean isAdmin = user.getRole() != null && user.getRole().name().equals("ADMIN");
                        System.out.println("  - User: " + user.getNom() + ", Role: " + user.getRole() + ", IsAdmin: " + isAdmin);
                        return !isAdmin;
                    })
                    .map(this::toDto)
                    .collect(Collectors.toList());
            System.out.println("✅ After filtering: " + result.size() + " users returned");
            return result;
        } catch (Exception e) {
            System.out.println("❌ Search error: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Search failed: " + e.getMessage(), e);
        }
    }

    private UtilisateurSearchDto toDto(Utilisateur utilisateur) {
        if (utilisateur == null) {
            return null;
        }
        
        return new UtilisateurSearchDto(
                utilisateur.getId(),
                utilisateur.getNom(),
                utilisateur.getEmail(),
                utilisateur.getRole() == null ? null : utilisateur.getRole().name()
        );
    }
}
