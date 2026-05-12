package t.esprit.arctic.jobmatch.service;

import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import t.esprit.arctic.jobmatch.entity.Participation;

import java.io.File;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

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
            if (!dir.exists()) dir.mkdirs();

            String filename = "certificat_" + UUID.randomUUID() + ".pdf";
            String filePath = storagePath + "/" + filename;

            PdfWriter writer = new PdfWriter(filePath);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf);

            String nomCandidat = participation.getCandidat().getNom()
                    + " " + participation.getCandidat().getPrenom();
            String nomEvenement = participation.getEvenement().getTitre();
            String dateEvenement = participation.getEvenement().getDateHeure()
                    .format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            String organisateur = participation.getEvenement().getOrganisateur().getNom();


            document.add(new Paragraph("CERTIFICAT DE PRÉSENCE")
                    .setFontSize(24)
                    .setBold()
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontColor(ColorConstants.DARK_GRAY)
                    .setMarginBottom(30));


            document.add(new Paragraph("Nous certifions que")
                    .setFontSize(14)
                    .setTextAlignment(TextAlignment.CENTER));

            document.add(new Paragraph(nomCandidat)
                    .setFontSize(20)
                    .setBold()
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontColor(ColorConstants.BLUE)
                    .setMarginTop(10)
                    .setMarginBottom(10));

            document.add(new Paragraph(
                    "a participé à l'événement « " + nomEvenement + " »\n" +
                            "organisé le " + dateEvenement + " par " + organisateur + ".")
                    .setFontSize(14)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(40));


            document.add(new Paragraph("Délivré automatiquement par la plateforme JobMatch")
                    .setFontSize(10)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontColor(ColorConstants.GRAY));

            document.close();

            return baseUrl + "/" + filename;

        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la génération du certificat", e);
        }
    }
}