package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import t.esprit.arctic.jobmatch.entity.Participation;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Attestation files as plain text (PDF stack removed).
 */
@Service
@RequiredArgsConstructor
public class AttestationService {

    @Value("${app.certificates.storage-path:./certificates}")
    private String storagePath;

    @Value("${app.certificates.base-url:http://localhost:8080/certificates}")
    private String baseUrl;

    public String generateCertificat(Participation participation) {
        try {
            File dir = new File(storagePath);
            if (!dir.exists()) {
                dir.mkdirs();
            }

            String filename = "certificat_" + UUID.randomUUID() + ".txt";
            String filePath = storagePath + "/" + filename;

            String nomCandidat = participation.getCandidat().getNom()
                    + " " + participation.getCandidat().getPrenom();
            String nomEvenement = participation.getEvenement().getTitre();
            String dateEvenement = participation.getEvenement().getDateHeure()
                    .format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            String organisateur = participation.getEvenement().getOrganisateur().getNom();

            String body = "CERTIFICAT DE PRÉSENCE\n\n"
                    + "Nous certifions que " + nomCandidat + "\n"
                    + "a participé à l'événement « " + nomEvenement + " »\n"
                    + "organisé le " + dateEvenement + " par " + organisateur + ".\n\n"
                    + "Délivré automatiquement par la plateforme JobMatch.\n";

            Files.writeString(new File(filePath).toPath(), body, StandardCharsets.UTF_8);

            return baseUrl + "/" + filename;
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la génération du certificat", e);
        }
    }
}
