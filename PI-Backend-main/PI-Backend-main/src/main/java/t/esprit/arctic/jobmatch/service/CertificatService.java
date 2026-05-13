package t.esprit.arctic.jobmatch.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import t.esprit.arctic.jobmatch.entity.Certificat;
import t.esprit.arctic.jobmatch.entity.InscriptionFormation;
import t.esprit.arctic.jobmatch.entity.InscriptionParcours;
import t.esprit.arctic.jobmatch.repository.CertificatRepository;
import t.esprit.arctic.jobmatch.repository.InscriptionFormationRepository;

import java.util.Date;
import java.util.List;

/**
 * Certificate persistence. PDF generation is disabled in slim deployments.
 */
@Slf4j
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

    @org.springframework.transaction.annotation.Transactional
    public Certificat genererPourParcours(InscriptionParcours inscriptionParcours) {
        if (inscriptionParcours == null || inscriptionParcours.getParcours() == null) {
            log.warn("Impossible de générer le certificat : Inscription ou Parcours null");
            return null;
        }

        t.esprit.arctic.jobmatch.entity.Formation formationExpert =
                inscriptionParcours.getParcours().getFormationParNiveau(
                        t.esprit.arctic.jobmatch.entity.NiveauOrdre.EXPERT);

        if (formationExpert == null) {
            log.warn("Aucune formation Expert trouvée pour le parcours : {}",
                    inscriptionParcours.getParcours().getTitre());
            return null;
        }

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

    /**
     * PDF generation disabled (no iText/PDFBox in slim build). Returns empty array;
     * use {@link t.esprit.arctic.jobmatch.controller.CertificatController} to return 503 if empty.
     */
    @org.springframework.transaction.annotation.Transactional
    public byte[] genererPdf(Long certificatId) {
        Certificat cert = getById(certificatId);
        if (cert.getVerificationCode() == null) {
            cert.setVerificationCode(java.util.UUID.randomUUID().toString());
            certificatRepository.save(cert);
        }
        log.info("PDF export disabled for certificat id={}", certificatId);
        return new byte[0];
    }
}
