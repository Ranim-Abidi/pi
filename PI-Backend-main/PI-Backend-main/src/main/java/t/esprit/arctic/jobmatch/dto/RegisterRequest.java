package t.esprit.arctic.jobmatch.dto;
import t.esprit.arctic.jobmatch.entity.Role;

public class RegisterRequest {
    public String nom;
    public String email;
    public String motDePasse;
    public Role role;
    public String roleString; // optional: ROLE_CANDIDAT or CANDIDAT

    // For Candidat
    public String prenom;
    public String telephone;
    public String niveauEtude;
    public String cv;
    public String lienPortfolio;
    public String description;

    // For Recruteur
    public String entreprise;
    public String poste;
    public String secteur;

    // For ClientFreelance
    public Double budget;

    // For OrganisateurEvenement
    public String organisation;
    public String adresse;
    public String descriptionProjet;
}