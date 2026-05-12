package t.esprit.arctic.jobmatch.service;

import org.springframework.stereotype.Service;
import t.esprit.arctic.jobmatch.entity.Role;
import t.esprit.arctic.jobmatch.entity.Utilisateur;
import t.esprit.arctic.jobmatch.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationPartenaireService {

    private final UtilisateurRepository utilisateurRepo;

    private final Map<Long, List<Map<String, Object>>>
            notifications = new HashMap<>();

    public void notifierTousCandidats(
            String titre,
            String message,
            String type) {

        List<Utilisateur> candidats =
                utilisateurRepo.findByRole(Role.CANDIDAT);

        List<Long> candidatIds = candidats.stream()
                .map(Utilisateur::getId)
                .collect(Collectors.toList());

        for (Long candidatId : candidatIds) {
            Map<String, Object> notif = new HashMap<>();
            notif.put("id", UUID.randomUUID().toString());
            notif.put("titre", titre);
            notif.put("message", message);
            notif.put("type", type);
            notif.put("lue", false);
            notif.put("date", new Date());

            notifications
                    .computeIfAbsent(candidatId,
                            k -> new ArrayList<>())
                    .add(0, notif);
        }
    }

    public List<Map<String, Object>> getNotifications(
            Long userId) {
        return notifications.getOrDefault(
                userId, new ArrayList<>());
    }

    public long countNonLues(Long userId) {
        return getNotifications(userId).stream()
                .filter(n -> !(boolean) n.get("lue"))
                .count();
    }

    public void marquerLue(Long userId, String notifId) {
        getNotifications(userId).stream()
                .filter(n -> notifId.equals(n.get("id")))
                .findFirst()
                .ifPresent(n -> n.put("lue", true));
    }

    public void marquerToutesLues(Long userId) {
        getNotifications(userId)
                .forEach(n -> n.put("lue", true));
    }
}