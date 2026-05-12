package t.esprit.arctic.jobmatch.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor

public class EvenementStatsResponse {

    private int totalEvenements;
    private int totalParticipations;
    private int totalConfirmees;
    private int totalEnAttente;
    private double tauxRemplissage;
    private String evenementLePlusPopulaire;
    private int maxParticipations;
}