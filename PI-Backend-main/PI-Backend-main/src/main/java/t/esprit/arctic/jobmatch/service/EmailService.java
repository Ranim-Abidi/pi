package t.esprit.arctic.jobmatch.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void envoyerCandidature(
            String emailEntreprise,

            String emailCandidat,
            String messageCandidat,
            String titreOffre,
            MultipartFile cv
    ) throws Exception {

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setTo(emailEntreprise);
        helper.setSubject("Candidature pour : " + titreOffre);
        helper.setText(
                "<div style='font-family:Arial,sans-serif; padding:20px;'>" +
                        "<h2 style='color:#6366f1;'>Nouvelle Candidature</h2>" +
                        "<hr/>" +
                        "<table style='width:100%;'>" +
                        "<tr><td><b>Offre :</b></td><td>" + titreOffre + "</td></tr>" +

                        "<tr><td><b>Email :</b></td><td>" +
                        "<a href='mailto:" + emailCandidat + "'>" + emailCandidat + "</a>" +
                        "</td></tr>" +
                        "</table>" +
                        "<hr/>" +
                        "<p><b>Message :</b></p>" +
                        "<p>" + messageCandidat + "</p>" +
                        "<hr/>" +
                        "<p style='color:#9ca3af;font-size:12px;'>Envoyé via JobMatch</p>" +
                        "</div>",
                true
        );

        if (cv != null && !cv.isEmpty()) {
            helper.addAttachment(cv.getOriginalFilename(), cv);
        }

        mailSender.send(message);
    }
}