package t.esprit.arctic.jobmatch.service;

import com.itextpdf.text.*;
import com.itextpdf.text.pdf.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import t.esprit.arctic.jobmatch.entity.Certificat;
import t.esprit.arctic.jobmatch.entity.InscriptionFormation;
import t.esprit.arctic.jobmatch.entity.InscriptionParcours;
import t.esprit.arctic.jobmatch.repository.CertificatRepository;
import t.esprit.arctic.jobmatch.repository.InscriptionFormationRepository;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class CertificatService {

    private final CertificatRepository certificatRepository;
    private final InscriptionFormationRepository inscriptionFormationRepository;

    @org.springframework.transaction.annotation.Transactional
    public Certificat genererAutomatiquement(InscriptionFormation inscription) {
        return certificatRepository.findByInscriptionId(inscription.getId())
                .orElseGet(() -> {
                    Certificat certificat = new Certificat();
                    certificat.setTitre("Certificat - " + inscription.getFormation().getTitre());
                    certificat.setDateObtention(new Date());
                    certificat.setVerificationCode(java.util.UUID.randomUUID().toString());
                    certificat.setInscription(inscription);
                    return certificatRepository.save(certificat);
                });
    }

    /**
     * Génère un certificat lié à un parcours quand le candidat réussit le quiz Expert.
     * On trouve ou crée une InscriptionFormation pour la formation Expert du parcours.
     */
    @org.springframework.transaction.annotation.Transactional
    public Certificat genererPourParcours(InscriptionParcours inscriptionParcours) {
        if (inscriptionParcours == null || inscriptionParcours.getParcours() == null) {
            System.err.println("❌ Impossible de générer le certificat : Inscription ou Parcours null");
            return null;
        }

        // Récupérer la formation Expert du parcours
        t.esprit.arctic.jobmatch.entity.Formation formationExpert =
                inscriptionParcours.getParcours().getFormationParNiveau(
                        t.esprit.arctic.jobmatch.entity.NiveauOrdre.EXPERT);

        if (formationExpert == null) {
            System.err.println("⚠️ Aucune formation Expert trouvée pour le parcours : " + inscriptionParcours.getParcours().getTitre());
            return null;
        }

        // Trouver ou créer une InscriptionFormation pour la formation Expert liée à ce parcours
        Long candidatId = inscriptionParcours.getCandidat().getId();
        Long formationId = formationExpert.getId();
        Long parcoursId = inscriptionParcours.getParcours().getId();

        InscriptionFormation inscriptionFormation = inscriptionFormationRepository
                .findByCandidatIdAndFormationIdAndParcoursId(candidatId, formationId, parcoursId)
                .orElseGet(() -> {
                    InscriptionFormation newInsc = new InscriptionFormation();
                    newInsc.setCandidat(inscriptionParcours.getCandidat());
                    newInsc.setFormation(formationExpert);
                    newInsc.setParcoursId(parcoursId);
                    newInsc.setDateInscription(new Date());
                    newInsc.setStatut("Terminé");
                    newInsc.setProgression(100.0);
                    return inscriptionFormationRepository.save(newInsc);
                });

        // Vérifier si un certificat existe déjà pour cette inscription
        return certificatRepository.findByInscriptionId(inscriptionFormation.getId())
                .orElseGet(() -> {
                    Certificat certificat = new Certificat();
                    certificat.setTitre("Certificat Parcours - " + inscriptionParcours.getParcours().getTitre());
                    certificat.setDateObtention(new Date());
                    certificat.setVerificationCode(java.util.UUID.randomUUID().toString());
                    certificat.setInscription(inscriptionFormation);
                    certificat.setParcours(inscriptionParcours.getParcours());
                    return certificatRepository.save(certificat);
                });
    }

    public List<Certificat> getAll() {
        return certificatRepository.findAll();
    }

    public Certificat getById(Long id) {
        return certificatRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Certificat non trouve : " + id));
    }

    public Certificat verifyByCode(String code) {
        return certificatRepository.findByVerificationCode(code)
                .orElseThrow(() -> new RuntimeException("Certificat invalide ou non trouve"));
    }

    public List<Certificat> getByCandidat(Long candidatId) {
        return certificatRepository.findByInscriptionCandidatId(candidatId);
    }

    private byte[] loadLogo() {
        String[] names = {"logo_transparent.png"};
        String workDir = System.getProperty("user.dir");
        for (String name : names) {
            try {
                Path p1 = Paths.get(workDir, "src", "main", "resources", "static", name);
                if (Files.exists(p1)) return Files.readAllBytes(p1);
                Path p2 = Paths.get(workDir, "target", "classes", "static", name);
                if (Files.exists(p2)) return Files.readAllBytes(p2);
                InputStream is = Thread.currentThread().getContextClassLoader()
                        .getResourceAsStream("static/" + name);
                if (is != null) { byte[] b = is.readAllBytes(); is.close(); return b; }
            } catch (Exception ignored) {}
        }
        return null;
    }

    @org.springframework.transaction.annotation.Transactional
    public byte[] genererPdf(Long certificatId) {
        Certificat cert = getById(certificatId);
        
        if (cert.getVerificationCode() == null) {
            cert.setVerificationCode(java.util.UUID.randomUUID().toString());
            certificatRepository.save(cert);
        }

        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();

            Rectangle pageSize = new Rectangle(PageSize.A4.getHeight(), PageSize.A4.getWidth());
            Document document  = new Document(pageSize, 0, 0, 0, 0);
            PdfWriter writer   = PdfWriter.getInstance(document, baos);
            document.open();

            PdfContentByte cb = writer.getDirectContent();
            float W = pageSize.getWidth();   // ~842
            float H = pageSize.getHeight();  // ~595

            BaseColor bleu      = new BaseColor(9,  101, 164);
            BaseColor bleuDark  = new BaseColor(5,   70, 115);
            BaseColor bleuLight = new BaseColor(230, 241, 251);
            BaseColor or        = new BaseColor(180, 140,  50);
            BaseColor orLight   = new BaseColor(212, 175,  55);
            BaseColor textMain  = new BaseColor(26,  26,  46);
            BaseColor textMuted = new BaseColor(100, 110, 125);
            BaseColor fondGris  = new BaseColor(245, 246, 248);
            BaseColor white     = BaseColor.WHITE;

            cb.setColorFill(fondGris);
            cb.rectangle(0, 0, W, H);
            cb.fill();

            float bOuter = 14f;
            float bGap   =  4f;
            float bInner =  2f;
            float bTotal = bOuter + bGap + bInner;

            cb.setColorFill(bleu);
            cb.rectangle(0, H - bOuter, W, bOuter); cb.fill();
            cb.rectangle(0, 0, W, bOuter);           cb.fill();
            cb.rectangle(0, 0, bOuter, H);           cb.fill();
            cb.rectangle(W - bOuter, 0, bOuter, H);  cb.fill();

            cb.setColorStroke(orLight);
            cb.setLineWidth(1.5f);
            float filetM = bOuter + bGap + 1;
            cb.rectangle(filetM, filetM, W - 2*filetM, H - 2*filetM);
            cb.stroke();

            cb.setLineWidth(0.7f);
            float filetM2 = filetM + 5;
            cb.rectangle(filetM2, filetM2, W - 2*filetM2, H - 2*filetM2);
            cb.stroke();

            float cS = 28f;
            float cM = bTotal + 8;
            cb.setColorStroke(orLight);
            cb.setLineWidth(1.8f);
            drawCorner(cb, cM,     H - cM, cS, "TL");
            drawCorner(cb, W - cM, H - cM, cS, "TR");
            drawCorner(cb, cM,     cM,     cS, "BL");
            drawCorner(cb, W - cM, cM,     cS, "BR");

            BaseFont bfBold  = BaseFont.createFont(BaseFont.HELVETICA_BOLD,         BaseFont.CP1252, false);
            BaseFont bfReg   = BaseFont.createFont(BaseFont.HELVETICA,              BaseFont.CP1252, false);
            BaseFont bfItal  = BaseFont.createFont(BaseFont.HELVETICA_OBLIQUE,      BaseFont.CP1252, false);
            BaseFont bfBItal = BaseFont.createFont(BaseFont.HELVETICA_BOLDOBLIQUE,  BaseFont.CP1252, false);

            float centerX = W / 2;   // centre de la page (pas de medaille, pas de decalage)
            float titleY  = H - bTotal - 55;

            cb.beginText();
            cb.setColorFill(textMain);
            cb.setFontAndSize(bfBold, 42);
            cb.showTextAligned(Element.ALIGN_CENTER, "CERTIFICAT", centerX, titleY, 0);
            cb.endText();

            cb.beginText();
            cb.setColorFill(textMuted);
            cb.setFontAndSize(bfReg, 13);
            cb.showTextAligned(Element.ALIGN_CENTER,
                    "DE REUSSITE DE FORMATION", centerX, titleY - 22, 0);
            cb.endText();

            cb.setColorStroke(orLight);
            cb.setLineWidth(1.2f);
            cb.moveTo(centerX - 160, titleY - 32);
            cb.lineTo(centerX + 160, titleY - 32);
            cb.stroke();

            float awardY = titleY - 65;
            cb.beginText();
            cb.setColorFill(textMuted);
            cb.setFontAndSize(bfItal, 13);
            cb.showTextAligned(Element.ALIGN_CENTER,
                    "Ce certificat est decerne a", centerX, awardY, 0);
            cb.endText();

            String nom = cert.getInscription().getCandidat().getNom() != null
                    ? cert.getInscription().getCandidat().getNom()
                    : cert.getInscription().getCandidat().getEmail();

            float nameY = awardY - 52;
            cb.beginText();
            cb.setColorFill(bleuDark);
            cb.setFontAndSize(bfBItal, 38);
            cb.showTextAligned(Element.ALIGN_CENTER, nom, centerX, nameY, 0);
            cb.endText();

            float nameW = nom.length() * 12f;
            cb.setColorStroke(orLight);
            cb.setLineWidth(0.8f);
            cb.moveTo(centerX - nameW/2, nameY - 8);
            cb.lineTo(centerX + nameW/2, nameY - 8);
            cb.stroke();

            float descY = nameY - 36;
            cb.beginText();
            cb.setColorFill(textMuted);
            cb.setFontAndSize(bfReg, 12);
            cb.showTextAligned(Element.ALIGN_CENTER,
                    "a complete avec succes la formation", centerX, descY, 0);
            cb.endText();

            String titreF = cert.getInscription().getFormation().getTitre();
            float formY   = descY - 26;
            cb.beginText();
            cb.setColorFill(textMain);
            cb.setFontAndSize(bfBold, 15);
            cb.showTextAligned(Element.ALIGN_CENTER, titreF, centerX, formY, 0);
            cb.endText();

            SimpleDateFormat sdf = new SimpleDateFormat("dd MMMM yyyy", Locale.FRENCH);
            float dateY = formY - 30;
            cb.beginText();
            cb.setColorFill(textMain);
            cb.setFontAndSize(bfBold, 12);
            cb.showTextAligned(Element.ALIGN_CENTER,
                    sdf.format(cert.getDateObtention()), centerX, dateY, 0);
            cb.endText();

            float sepY = dateY - 22;
            cb.setColorStroke(new BaseColor(210, 215, 225));
            cb.setLineWidth(0.6f);
            cb.moveTo(centerX - 140, sepY);
            cb.lineTo(centerX + 140, sepY);
            cb.stroke();

            float sigY = sepY - 28;
            cb.beginText();
            cb.setColorFill(bleuDark);
            cb.setFontAndSize(bfItal, 14);
            cb.showTextAligned(Element.ALIGN_CENTER, "Matchy Khedma", centerX, sigY, 0);
            cb.endText();

            cb.beginText();
            cb.setColorFill(textMuted);
            cb.setFontAndSize(bfReg, 9);
            cb.showTextAligned(Element.ALIGN_CENTER, "DIRECTEUR PEDAGOGIQUE", centerX, sigY - 14, 0);
            cb.endText();

            float logoSize = 70f;
            float logoX    = centerX - logoSize / 2f;
            float logoY    = sigY - 14f - logoSize - 8f;

            byte[] logoBytes = loadLogo();
            if (logoBytes != null) {
                PdfTemplate tmpl = cb.createTemplate(logoSize, logoSize);
                Image img = Image.getInstance(logoBytes);
                img.scaleToFit(logoSize, logoSize);
                img.setAbsolutePosition(
                        (logoSize - img.getScaledWidth())  / 2f,
                        (logoSize - img.getScaledHeight()) / 2f
                );
                tmpl.addImage(img);
                cb.addTemplate(tmpl, logoX, logoY);
            }

            float detY  = bTotal + 48;
            float detX  = bTotal + 40;

            String[] lbs  = {"Plateforme", "Duree", "Niveau"};
            String[] vals = {
                    cert.getInscription().getFormation().getPlateforme(),
                    cert.getInscription().getFormation().getDuree(),
                    cert.getInscription().getFormation().getNiveau()
            };

            for (int i = 0; i < 3; i++) {
                float itemX = detX + i * 145f;

                cb.beginText();
                cb.setColorFill(textMuted);
                cb.setFontAndSize(bfReg, 7.5f);
                cb.showTextAligned(Element.ALIGN_LEFT,
                        lbs[i].toUpperCase(), itemX, detY + 12, 0);
                cb.endText();

                cb.beginText();
                cb.setColorFill(bleu);
                cb.setFontAndSize(bfBold, 10);
                cb.showTextAligned(Element.ALIGN_LEFT, vals[i], itemX, detY, 0);
                cb.endText();
            }

            float qrSize = 60f;
            float rightAlign = W - bTotal - 40;
            
            if (cert.getVerificationCode() != null) {
                String verifyUrl = "http://localhost:4200/verify-certificat/" + cert.getVerificationCode();
                BarcodeQRCode qrcode = new BarcodeQRCode(verifyUrl, 100, 100, null);
                Image qrcodeImage = qrcode.getImage();
                qrcodeImage.scaleAbsolute(qrSize, qrSize);
                qrcodeImage.setAbsolutePosition(rightAlign - qrSize, bTotal + 40);
                cb.addImage(qrcodeImage);
            }

            cb.beginText();
            cb.setColorFill(textMuted);
            cb.setFontAndSize(bfReg, 7.5f);
            cb.showTextAligned(Element.ALIGN_RIGHT,
                    "N Certificat : CERT-" + String.format("%05d", cert.getId()),
                    rightAlign, bTotal + 30, 0);
            cb.endText();

            cb.beginText();
            cb.setColorFill(textMuted);
            cb.setFontAndSize(bfReg, 7f);
            cb.showTextAligned(Element.ALIGN_RIGHT,
                    "Vérifiez l'authenticité de ce document en scannant le QR code",
                    rightAlign, bTotal + 20, 0);
            cb.endText();

            document.close();
            return baos.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Erreur generation PDF : " + e.getMessage());
        }
    }

    private void drawCorner(PdfContentByte cb, float x, float y, float size, String pos) throws Exception {
        float s = size;
        float g = 6f;

        switch (pos) {
            case "TL":
                cb.moveTo(x, y - s); cb.lineTo(x, y); cb.lineTo(x + s, y); cb.stroke();
                cb.moveTo(x + g, y - s + g); cb.lineTo(x + g, y - g); cb.lineTo(x + s - g, y - g); cb.stroke();
                break;
            case "TR":
                cb.moveTo(x - s, y); cb.lineTo(x, y); cb.lineTo(x, y - s); cb.stroke();
                cb.moveTo(x - s + g, y - g); cb.lineTo(x - g, y - g); cb.lineTo(x - g, y - s + g); cb.stroke();
                break;
            case "BL":
                cb.moveTo(x, y + s); cb.lineTo(x, y); cb.lineTo(x + s, y); cb.stroke();
                cb.moveTo(x + g, y + s - g); cb.lineTo(x + g, y + g); cb.lineTo(x + s - g, y + g); cb.stroke();
                break;
            case "BR":
                cb.moveTo(x - s, y); cb.lineTo(x, y); cb.lineTo(x, y + s); cb.stroke();
                cb.moveTo(x - s + g, y + g); cb.lineTo(x - g, y + g); cb.lineTo(x - g, y + s - g); cb.stroke();
                break;
        }
    }
}