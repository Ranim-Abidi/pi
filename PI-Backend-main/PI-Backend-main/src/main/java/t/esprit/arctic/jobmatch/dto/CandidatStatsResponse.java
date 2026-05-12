package t.esprit.arctic.jobmatch.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor

public class CandidatStatsResponse {
    // Nombre total de participations
    private int totalParticipations;

    // Nombre de participations confirmées
    private int totalConfirmees;

    // Nombre de participations en attente
    private int totalEnAttente;

    // Nombre de participations refusées
    private int totalRefusees;

    // Événement favori (type le plus participé)
    private String typeFavori;
}
