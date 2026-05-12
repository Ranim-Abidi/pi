package t.esprit.arctic.jobmatch.freelance.service;

import com.pusher.rest.Pusher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import t.esprit.arctic.jobmatch.freelance.entity.Mission;
import t.esprit.arctic.jobmatch.entity.Utilisateur;
import t.esprit.arctic.jobmatch.freelance.dto.*;
import t.esprit.arctic.jobmatch.freelance.entity.*;
import t.esprit.arctic.jobmatch.freelance.exception.FreelanceAccessDeniedException;
import t.esprit.arctic.jobmatch.freelance.exception.FreelanceBadRequestException;
import t.esprit.arctic.jobmatch.freelance.exception.FreelanceConflictException;
import t.esprit.arctic.jobmatch.freelance.exception.FreelanceNotFoundException;
import t.esprit.arctic.jobmatch.freelance.repository.*;
import t.esprit.arctic.jobmatch.repository.UtilisateurRepository;
import t.esprit.arctic.jobmatch.service.NotificationService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FreelanceWorkspaceService {

    private final FreelanceContractRepository contractRepository;
    private final FreelancePaymentRepository paymentRepository;
    private final FreelanceChatRoomRepository roomRepository;
    private final FreelanceChatMessageRepository messageRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final MissionRepository missionRepository;
    private final FreelanceMilestoneRepository milestoneRepository;
    private final FreelanceDisputeRepository disputeRepository;
    private final ObjectProvider<Pusher> pusherProvider;
    private final NotificationService notificationService;
    private final FreelanceInvoiceService invoiceService;

    private Utilisateur findUser(String email) {
        return utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new FreelanceNotFoundException("Utilisateur non trouvé"));
    }

    // ==========================================
    // CHAT SYSTEM
    // ==========================================

    @Transactional
    public FreelanceChatRoomDTO getOrCreateRoom(String email, Long missionId, Long freelancerId) {
        Utilisateur requester = findUser(email);
        if (missionId == null || freelancerId == null) {
            throw new FreelanceBadRequestException("missionId et freelancerId sont requis");
        }

        Mission mission = missionRepository.findById(missionId)
                .orElseThrow(() -> new FreelanceNotFoundException("Mission introuvable"));
        if (mission.getPubliePar() == null) {
            throw new FreelanceConflictException("Mission sans propriétaire");
        }
        Utilisateur client = mission.getPubliePar();
        Utilisateur freelancer = utilisateurRepository.findById(freelancerId)
                .orElseThrow(() -> new FreelanceNotFoundException("Freelancer introuvable"));

        boolean requesterIsClient = requester.getId().equals(client.getId());
        boolean requesterIsFreelancer = requester.getId().equals(freelancer.getId());
        if (!requesterIsClient && !requesterIsFreelancer) {
            throw new FreelanceAccessDeniedException("Seuls le client et le freelancer du contrat peuvent ouvrir ce salon");
        }
        if (requesterIsFreelancer && !requester.getId().equals(freelancerId)) {
            throw new FreelanceAccessDeniedException("Le freelancer connecté ne correspond pas à ce salon");
        }

        FreelanceChatRoom room = roomRepository.findByParticipantsAndMission(missionId, client.getId(), freelancerId)
                .orElseGet(() -> {
                    FreelanceChatRoom newRoom = new FreelanceChatRoom();
                    newRoom.setClient(client);
                    newRoom.setFreelancer(freelancer);
                    newRoom.setMission(mission);
                    return roomRepository.save(newRoom);
                });
                
        return FreelanceChatRoomDTO.fromEntity(room);
    }

    @Transactional(readOnly = true)
    public List<FreelanceChatRoomDTO> getMyRooms(String email) {
        Utilisateur user = findUser(email);
        return roomRepository.findByUserId(user.getId()).stream()
                .map(FreelanceChatRoomDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FreelanceChatMessageDTO> getRoomMessages(Long roomId, String email) {
        Utilisateur user = findUser(email);
        FreelanceChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new FreelanceNotFoundException("Salon introuvable"));
        assertRoomParticipant(room, user.getId());
        return messageRepository.findByRoomIdOrderByCreatedAtAsc(roomId).stream()
                .map(FreelanceChatMessageDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public FreelanceChatMessageDTO sendMessage(String email, Long roomId, String content) {
        Utilisateur sender = findUser(email);
        FreelanceChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new FreelanceNotFoundException("Salon introuvable"));
        assertRoomParticipant(room, sender.getId());
        if (content == null || content.trim().isEmpty()) {
            throw new FreelanceBadRequestException("Le contenu du message est obligatoire");
        }

        FreelanceChatMessage msg = new FreelanceChatMessage();
        msg.setRoom(room);
        msg.setSender(sender);
        msg.setContent(content.trim());
        msg = messageRepository.save(msg);
        
        FreelanceChatMessageDTO dto = FreelanceChatMessageDTO.fromEntity(msg);
        
        // Push notification via Websockets (Pusher)
        try {
            Pusher pusher = pusherProvider.getIfAvailable();
            if (pusher != null) {
                pusher.trigger("chat-room-" + roomId, "new-message", dto);
            }
        } catch (Exception e) {
            log.warn("Pusher trigger failed for room {}", roomId, e);
        }
        Long receiverId = room.getClient().getId().equals(sender.getId())
                ? room.getFreelancer().getId()
                : room.getClient().getId();
        notificationService.createNotification(
                receiverId,
                sender.getId(),
                "freelance_new_message",
                "Nouveau message de " + sender.getNom() + " sur la mission \"" + room.getMission().getTitre() + "\""
        );

        return dto;
    }

    // ==========================================
    // CONTRACT & PAYMENT SYSTEM
    // ==========================================

    @Transactional(readOnly = true)
    public List<FreelanceContractDTO> getMyContracts(String email) {
        Utilisateur user = findUser(email);
        List<FreelanceContract> contracts = java.util.stream.Stream.concat(
                        contractRepository.findByClientId(user.getId()).stream(),
                        contractRepository.findByFreelancerId(user.getId()).stream()
                )
                .collect(Collectors.toMap(FreelanceContract::getId, c -> c, (a, b) -> a))
                .values()
                .stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .collect(Collectors.toList());

        return contracts.stream().map(this::getContractDetailsEntity).collect(Collectors.toList());
    }

    @Transactional
    public FreelanceContractDTO proposeContract(String email, Long missionId, Long freelancerId, Double amount, String terms) {
        Utilisateur client = findUser(email);
        Mission mission = missionRepository.findById(missionId)
                .orElseThrow(() -> new FreelanceNotFoundException("Mission introuvable"));
        if (mission.getPubliePar() == null || !client.getId().equals(mission.getPubliePar().getId())) {
            throw new FreelanceAccessDeniedException("Seul le propriétaire de mission peut proposer un contrat");
        }
        Utilisateur fl = utilisateurRepository.findById(freelancerId)
                .orElseThrow(() -> new FreelanceNotFoundException("Freelancer introuvable"));
        validateAmount(amount);

        FreelanceContract existing = findReusableContract(missionId, freelancerId);
        if (existing != null) {
            return getContractDetailsEntity(existing);
        }

        FreelanceContract contract = new FreelanceContract();
        contract.setMission(mission);
        contract.setClient(client);
        contract.setFreelancer(fl);
        contract.setAmount(amount);
        contract.setTerms((terms == null || terms.trim().isEmpty())
                ? buildContractTerms(client, fl, mission, amount)
                : terms.trim());
        contract.setTermsVersion(1);
        contract.setAuditTrail("PROPOSED by " + client.getEmail() + " at " + LocalDateTime.now());
        contract.setStatus(ContractStatus.PROPOSED);

        return FreelanceContractDTO.fromEntity(contractRepository.save(contract));
    }

    @Transactional
    public FreelanceContractDTO generateContract(String email, Long missionId, Long freelancerId, Double amount) {
        Utilisateur client = findUser(email);
        Mission mission = missionRepository.findById(missionId)
                .orElseThrow(() -> new FreelanceNotFoundException("Mission introuvable"));
        if (mission.getPubliePar() == null || !client.getId().equals(mission.getPubliePar().getId())) {
            throw new FreelanceAccessDeniedException("Seul le propriétaire de mission peut générer un contrat");
        }
        Utilisateur fl = utilisateurRepository.findById(freelancerId)
                .orElseThrow(() -> new FreelanceNotFoundException("Freelancer introuvable"));
        validateAmount(amount);

        FreelanceContract existing = findReusableContract(missionId, freelancerId);
        if (existing != null) {
            return getContractDetailsEntity(existing);
        }

        FreelanceContract contract = new FreelanceContract();
        contract.setMission(mission);
        contract.setClient(client);
        contract.setFreelancer(fl);
        contract.setAmount(amount);
        
        contract.setTerms(buildContractTerms(client, fl, mission, amount));
        contract.setTermsVersion(1);
        contract.setAuditTrail("PROPOSED by " + client.getEmail() + " at " + LocalDateTime.now());
        contract.setSmartContractHash("0x" + UUID.randomUUID().toString().replace("-", ""));
        contract.setStatus(ContractStatus.PROPOSED);
        contract.setClientAccepted(false);
        contract.setFreelancerAccepted(false);

        return FreelanceContractDTO.fromEntity(contractRepository.save(contract));
    }

    @Transactional
    public FreelanceMilestoneDTO addMilestone(String email, Long contractId, String title, String description, Double amount, LocalDateTime dueDate) {
        Utilisateur user = findUser(email);
        FreelanceContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new FreelanceNotFoundException("Contrat introuvable"));
        assertContractClient(contract, user.getId());
        validateAmount(amount);

        FreelanceMilestone m = new FreelanceMilestone();
        m.setContract(contract);
        m.setTitle(title);
        m.setDescription(description);
        m.setAmount(amount);
        m.setDueDate(dueDate);
        m.setStatus(hasAvailableEscrowForMilestone(contract, amount) ? MilestoneStatus.FUNDED : MilestoneStatus.PENDING);
        FreelanceMilestone saved = milestoneRepository.save(m);
        notificationService.createNotification(
                contract.getFreelancer().getId(),
                contract.getClient().getId(),
                "freelance_deadline_added",
                "Nouveau milestone \"" + title + "\" avec échéance le " + dueDate
        );
        return FreelanceMilestoneDTO.fromEntity(saved);
    }

    @Transactional
    public FreelanceContractDTO acceptContract(String email, Long contractId, String signature) {
        FreelanceContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new FreelanceNotFoundException("Contrat introuvable"));
        Utilisateur user = findUser(email);
        assertContractParticipant(contract, user.getId());
        
        if (contract.getClient().getEmail().equals(email)) {
            contract.setClientAccepted(true);
            contract.setClientSignature(signature);
        } else if (contract.getFreelancer().getEmail().equals(email)) {
            contract.setFreelancerAccepted(true);
            contract.setFreelancerSignature(signature);
        }
        
        // If both accepted, set ACTIVE
        if (Boolean.TRUE.equals(contract.getClientAccepted()) && Boolean.TRUE.equals(contract.getFreelancerAccepted())) {
            contract.setStatus(ContractStatus.ACTIVE);
            if (contract.getSmartContractHash() == null) {
                contract.setSmartContractHash("0x" + java.util.UUID.randomUUID().toString().replace("-", ""));
            }
        }
        appendAudit(contract, "CONTRACT_ACCEPTED by " + user.getEmail());
        
        return FreelanceContractDTO.fromEntity(contractRepository.save(contract));
    }

    @Transactional
    public FreelanceContractDTO fundEscrow(String email, Long contractId, Double amount) {
        Utilisateur client = findUser(email);
        FreelanceContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new FreelanceNotFoundException("Contrat introuvable"));
        assertContractClient(contract, client.getId());
        validateAmount(amount);
        if (contract.getStatus() != ContractStatus.ACTIVE) {
            throw new FreelanceConflictException("Le contrat doit être actif pour financer l'escrow");
        }

        FreelancePayment payment = new FreelancePayment();
        payment.setContract(contract);
        payment.setAmount(amount);
        payment.setStatus(PaymentStatus.ESCROWED);
        paymentRepository.save(payment);

        contract.setTotalEscrow((contract.getTotalEscrow() == null ? 0.0 : contract.getTotalEscrow()) + amount);
        appendAudit(contract, "ESCROW_FUNDED amount=" + amount + " by " + client.getEmail());
        contractRepository.save(contract);
        notificationService.createNotification(
                contract.getFreelancer().getId(),
                client.getId(),
                "freelance_payment_received",
                "Escrow alimenté de " + amount + " TND pour la mission \"" + contract.getMission().getTitre() + "\""
        );

        markMilestonesAsFunded(contract.getId());
        return getContractDetails(contractId);
    }

    @Transactional
    public FreelanceContractDTO simulateStripePayment(String email, Long contractId, Double amount, String stripeToken) {
        Utilisateur client = findUser(email);
        FreelanceContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new FreelanceNotFoundException("Contrat introuvable"));
        assertContractClient(contract, client.getId());
        validateAmount(amount);

        FreelancePayment payment = new FreelancePayment();
        payment.setContract(contract);
        payment.setAmount(amount);
        payment.setMethod("STRIPE_CREDIT_CARD");
        
        if ("tok_fail".equals(stripeToken)) {
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
            throw new FreelanceConflictException("Payment failed. Card declined.");
        }
        
        payment.setStatus(PaymentStatus.ESCROWED);
        paymentRepository.save(payment);
        
        contract.setTotalEscrow((contract.getTotalEscrow() == null ? 0.0 : contract.getTotalEscrow()) + amount);
        appendAudit(contract, "ESCROW_FUNDED_STRIPE amount=" + amount + " by " + client.getEmail());
        contractRepository.save(contract);
        
        markMilestonesAsFunded(contract.getId());
        return getContractDetails(contractId);
    }

    @Transactional
    public FreelanceContractDTO releasePayment(String email, Long contractId) {
        Utilisateur client = findUser(email);
        FreelanceContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new FreelanceNotFoundException("Contrat introuvable"));
        assertContractClient(contract, client.getId());
        if (contract.getStatus() != ContractStatus.ACTIVE) {
            throw new FreelanceConflictException("Le contrat doit être actif pour libérer le paiement");
        }

        List<FreelancePayment> payments = paymentRepository.findByContractId(contractId);
        for (FreelancePayment p : payments) {
            if (p.getStatus() == PaymentStatus.ESCROWED) {
                p.setStatus(PaymentStatus.RELEASED);
                p.setReleasedAt(LocalDateTime.now());
                paymentRepository.save(p);
                invoiceService.generateInvoiceFromPayment(contract, p, 0.0);

                contract.setTotalEscrow((contract.getTotalEscrow() == null ? 0.0 : contract.getTotalEscrow()) - p.getAmount());
            }
        }

        List<FreelanceMilestone> milestones = milestoneRepository.findByContractId(contractId);
        for (FreelanceMilestone m : milestones) {
            if (m.getStatus() == MilestoneStatus.APPROVED || m.getStatus() == MilestoneStatus.SUBMITTED || m.getStatus() == MilestoneStatus.FUNDED) {
                m.setStatus(MilestoneStatus.PAID);
                milestoneRepository.save(m);
            }
        }

        contract.setStatus(ContractStatus.COMPLETED);
        appendAudit(contract, "PAYMENT_RELEASED by " + client.getEmail());
        contractRepository.save(contract);
        notificationService.createNotification(
                contract.getFreelancer().getId(),
                client.getId(),
                "freelance_payment_received",
                "Paiement libéré pour le contrat #" + contract.getId()
        );

        return getContractDetails(contractId);
    }

    @Transactional
    public FreelanceMilestoneDTO releaseMilestonePayment(String email, Long milestoneId) {
        Utilisateur client = findUser(email);
        FreelanceMilestone milestone = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new FreelanceNotFoundException("Milestone introuvable"));
        FreelanceContract contract = milestone.getContract();
        assertContractClient(contract, client.getId());
        if (milestone.getStatus() != MilestoneStatus.APPROVED) {
            throw new FreelanceConflictException("Le milestone doit être approuvé avant paiement");
        }
        double escrow = contract.getTotalEscrow() == null ? 0.0 : contract.getTotalEscrow();
        if (escrow < milestone.getAmount()) {
            throw new FreelanceConflictException("Escrow insuffisant pour payer ce milestone");
        }

        FreelancePayment payment = new FreelancePayment();
        payment.setContract(contract);
        payment.setAmount(milestone.getAmount());
        payment.setStatus(PaymentStatus.RELEASED);
        payment.setReleasedAt(LocalDateTime.now());
        payment.setMethod("MILESTONE_RELEASE");
        paymentRepository.save(payment);
        invoiceService.generateInvoiceFromPayment(contract, payment, 0.0);

        contract.setTotalEscrow(escrow - milestone.getAmount());
        if ((contract.getTotalEscrow() == null || contract.getTotalEscrow() <= 0.0)
                && milestoneRepository.findByContractId(contract.getId()).stream().allMatch(m -> m.getStatus() == MilestoneStatus.PAID || m.getId().equals(milestoneId))) {
            contract.setStatus(ContractStatus.COMPLETED);
        }
        appendAudit(contract, "MILESTONE_PAID milestoneId=" + milestoneId + " amount=" + milestone.getAmount() + " by " + client.getEmail());
        contractRepository.save(contract);

        milestone.setStatus(MilestoneStatus.PAID);
        notificationService.createNotification(
                contract.getFreelancer().getId(),
                client.getId(),
                "freelance_payment_received",
                "Paiement reçu pour milestone \"" + milestone.getTitle() + "\""
        );
        return FreelanceMilestoneDTO.fromEntity(milestoneRepository.save(milestone));
    }

    @Transactional
    public FreelanceMilestoneDTO requestMilestoneRevision(String email, Long milestoneId, String feedback) {
        Utilisateur user = findUser(email);
        FreelanceMilestone m = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new FreelanceNotFoundException("Milestone introuvable"));
        assertContractClient(m.getContract(), user.getId());
        if (m.getStatus() != MilestoneStatus.SUBMITTED) {
            throw new FreelanceConflictException("Révision possible uniquement après soumission du milestone");
        }
        m.setStatus(MilestoneStatus.CHANGES_REQUESTED);
        m.setClientFeedback(feedback == null ? "" : feedback.trim());
        appendAudit(m.getContract(), "MILESTONE_REVISION_REQUEST milestoneId=" + milestoneId + " by " + user.getEmail());
        contractRepository.save(m.getContract());
        return FreelanceMilestoneDTO.fromEntity(milestoneRepository.save(m));
    }

    @Transactional
    public FreelanceMilestoneDTO submitMilestone(String email, Long milestoneId, String submissionNote, String deliveryUrl) {
        Utilisateur user = findUser(email);
        FreelanceMilestone m = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new FreelanceNotFoundException("Milestone introuvable"));
        assertContractFreelancer(m.getContract(), user.getId());
        if (m.getStatus() == MilestoneStatus.PAID || m.getStatus() == MilestoneStatus.APPROVED || m.getStatus() == MilestoneStatus.SUBMITTED) {
            throw new FreelanceConflictException("Ce milestone ne peut pas être soumis dans son état actuel");
        }
        if (m.getStatus() != MilestoneStatus.PENDING
                && m.getStatus() != MilestoneStatus.FUNDED
                && m.getStatus() != MilestoneStatus.CHANGES_REQUESTED) {
            throw new FreelanceConflictException("Soumission autorisée seulement pour un milestone pending/funded/en demande de changements");
        }
        String note = submissionNote == null ? "" : submissionNote.trim();
        String url = deliveryUrl == null ? "" : deliveryUrl.trim();
        if (note.isEmpty() && url.isEmpty()) {
            throw new FreelanceBadRequestException("Ajoutez une note de soumission ou un lien de livraison");
        }
        m.setStatus(MilestoneStatus.SUBMITTED);
        m.setSubmissionNote(note);
        m.setDeliveryUrl(url);
        m.setSubmittedAt(LocalDateTime.now());
        appendAudit(m.getContract(), "MILESTONE_SUBMITTED milestoneId=" + milestoneId + " by " + user.getEmail());
        contractRepository.save(m.getContract());
        notificationService.createNotification(
                m.getContract().getClient().getId(),
                user.getId(),
                "freelance_deadline_soon",
                "Milestone soumis: \"" + m.getTitle() + "\" attend votre review"
        );
        return FreelanceMilestoneDTO.fromEntity(milestoneRepository.save(m));
    }

    @Transactional
    public FreelanceMilestoneDTO approveMilestone(String email, Long milestoneId, String feedback) {
        Utilisateur user = findUser(email);
        FreelanceMilestone m = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new FreelanceNotFoundException("Milestone introuvable"));
        assertContractClient(m.getContract(), user.getId());
        if (m.getStatus() != MilestoneStatus.SUBMITTED) {
            throw new FreelanceConflictException("Seul un milestone soumis peut être approuvé");
        }
        m.setStatus(MilestoneStatus.APPROVED);
        m.setClientFeedback(feedback == null ? "" : feedback.trim());
        m.setApprovedAt(LocalDateTime.now());
        appendAudit(m.getContract(), "MILESTONE_APPROVED milestoneId=" + milestoneId + " by " + user.getEmail());

        FreelanceContract contract = m.getContract();
        double escrow = contract.getTotalEscrow() == null ? 0.0 : contract.getTotalEscrow();
        if (escrow < m.getAmount()) {
            double topUp = m.getAmount() - escrow;
            FreelancePayment escrowTopUp = new FreelancePayment();
            escrowTopUp.setContract(contract);
            escrowTopUp.setAmount(topUp);
            escrowTopUp.setStatus(PaymentStatus.ESCROWED);
            escrowTopUp.setMethod("AUTO_ESCROW_TOPUP_ON_APPROVAL");
            paymentRepository.save(escrowTopUp);
            contract.setTotalEscrow(escrow + topUp);
            appendAudit(contract, "ESCROW_AUTO_TOPUP_ON_APPROVAL milestoneId=" + milestoneId + " amount=" + topUp);
            escrow = contract.getTotalEscrow();
        }

        FreelancePayment payment = new FreelancePayment();
        payment.setContract(contract);
        payment.setAmount(m.getAmount());
        payment.setStatus(PaymentStatus.RELEASED);
        payment.setReleasedAt(LocalDateTime.now());
        payment.setMethod("AUTO_MILESTONE_RELEASE");
        paymentRepository.save(payment);
        invoiceService.generateInvoiceFromPayment(contract, payment, 0.0);

        contract.setTotalEscrow(escrow - m.getAmount());
        m.setStatus(MilestoneStatus.PAID);
        appendAudit(contract, "MILESTONE_AUTO_PAID milestoneId=" + milestoneId + " amount=" + m.getAmount() + " by " + user.getEmail());

        contractRepository.save(contract);
        milestoneRepository.save(m);
        notificationService.createNotification(
                contract.getFreelancer().getId(),
                user.getId(),
                "freelance_payment_received",
                "Milestone approuvé et payé: \"" + m.getTitle() + "\""
        );

        if ((contract.getTotalEscrow() == null || contract.getTotalEscrow() <= 0.0)
                && milestoneRepository.findByContractId(contract.getId()).stream().allMatch(ms -> ms.getStatus() == MilestoneStatus.PAID)) {
            contract.setStatus(ContractStatus.COMPLETED);
            appendAudit(contract, "CONTRACT_COMPLETED_ALL_MILESTONES_PAID");
            contractRepository.save(contract);
        }

        return FreelanceMilestoneDTO.fromEntity(m);
    }

    @Transactional
    public FreelanceDisputeDTO openDispute(String email, Long contractId, String reason, String evidenceNotes) {
        Utilisateur user = findUser(email);
        FreelanceContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new FreelanceNotFoundException("Contrat introuvable"));
        assertContractParticipant(contract, user.getId());
        if (contract.getStatus() == ContractStatus.COMPLETED || contract.getStatus() == ContractStatus.CANCELLED) {
            throw new FreelanceConflictException("Impossible d'ouvrir un litige sur un contrat clôturé");
        }
        FreelanceDispute dispute = new FreelanceDispute();
        dispute.setContract(contract);
        dispute.setOpenedBy(user);
        dispute.setReason(reason == null ? "" : reason.trim());
        dispute.setEvidenceNotes(evidenceNotes == null ? "" : evidenceNotes.trim());
        contract.setStatus(ContractStatus.DISPUTED);
        appendAudit(contract, "DISPUTE_OPENED by " + user.getEmail());
        contractRepository.save(contract);
        return FreelanceDisputeDTO.fromEntity(disputeRepository.save(dispute));
    }

    @Transactional
    public FreelanceContractDTO pauseContract(String email, Long contractId) {
        Utilisateur user = findUser(email);
        FreelanceContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new FreelanceNotFoundException("Contrat introuvable"));
        assertContractParticipant(contract, user.getId());
        if (contract.getStatus() != ContractStatus.ACTIVE) {
            throw new FreelanceConflictException("Seuls les contrats actifs peuvent être mis en pause");
        }
        contract.setStatus(ContractStatus.PAUSED);
        appendAudit(contract, "CONTRACT_PAUSED by " + user.getEmail());
        return getContractDetailsEntity(contractRepository.save(contract));
    }

    @Transactional
    public FreelanceContractDTO resumeContract(String email, Long contractId) {
        Utilisateur user = findUser(email);
        FreelanceContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new FreelanceNotFoundException("Contrat introuvable"));
        assertContractParticipant(contract, user.getId());
        if (contract.getStatus() != ContractStatus.PAUSED) {
            throw new FreelanceConflictException("Seuls les contrats en pause peuvent être repris");
        }
        contract.setStatus(ContractStatus.ACTIVE);
        appendAudit(contract, "CONTRACT_RESUMED by " + user.getEmail());
        return getContractDetailsEntity(contractRepository.save(contract));
    }

    @Transactional
    public FreelanceContractDTO cancelContract(String email, Long contractId) {
        Utilisateur user = findUser(email);
        FreelanceContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new FreelanceNotFoundException("Contrat introuvable"));
        assertContractParticipant(contract, user.getId());
        if (contract.getStatus() == ContractStatus.COMPLETED) {
            throw new FreelanceConflictException("Un contrat terminé ne peut pas être annulé");
        }
        contract.setStatus(ContractStatus.CANCELLED);
        appendAudit(contract, "CONTRACT_CANCELLED by " + user.getEmail());
        return getContractDetailsEntity(contractRepository.save(contract));
    }

    @Transactional
    public FreelanceDisputeDTO resolveDispute(String email, Long disputeId, String resolution) {
        Utilisateur user = findUser(email);
        FreelanceDispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new FreelanceNotFoundException("Litige introuvable"));
        assertContractParticipant(dispute.getContract(), user.getId());

        DisputeStatus nextStatus;
        if ("CLIENT".equalsIgnoreCase(resolution)) {
            nextStatus = DisputeStatus.RESOLVED_CLIENT;
        } else if ("FREELANCER".equalsIgnoreCase(resolution)) {
            nextStatus = DisputeStatus.RESOLVED_FREELANCER;
        } else {
            nextStatus = DisputeStatus.CLOSED;
        }
        dispute.setStatus(nextStatus);
        appendAudit(dispute.getContract(), "DISPUTE_RESOLVED disputeId=" + disputeId + " resolution=" + nextStatus.name() + " by " + user.getEmail());
        contractRepository.save(dispute.getContract());
        return FreelanceDisputeDTO.fromEntity(disputeRepository.save(dispute));
    }

    // ── Ratings (client ↔ freelancer) ─────────────────────────────────────

    @Transactional
    public FreelanceContractDTO rateFreelancer(
            String email,
            Long contractId,
            Integer rating,
            String comment
    ) {
        Utilisateur client = findUser(email);
        FreelanceContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new FreelanceNotFoundException("Contrat introuvable"));

        assertContractClient(contract, client.getId());
        if (contract.getStatus() != ContractStatus.COMPLETED) {
            throw new FreelanceConflictException("La notation est disponible uniquement après la complétion du contrat");
        }
        if (rating == null || rating < 1 || rating > 5) {
            throw new FreelanceBadRequestException("La note doit être un entier entre 1 et 5");
        }
        if (contract.getClientRating() != null) {
            throw new FreelanceConflictException("Vous avez déjà noté ce freelancer");
        }

        contract.setClientRating(rating);
        contract.setClientRatingComment(comment == null ? "" : comment.trim());
        appendAudit(contract, "CONTRACT_RATED client->freelancer rating=" + rating + " by " + client.getEmail());
        return getContractDetailsEntity(contractRepository.save(contract));
    }

    @Transactional
    public FreelanceContractDTO rateClient(
            String email,
            Long contractId,
            Integer rating,
            String comment
    ) {
        Utilisateur freelancer = findUser(email);
        FreelanceContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new FreelanceNotFoundException("Contrat introuvable"));

        assertContractFreelancer(contract, freelancer.getId());
        if (contract.getStatus() != ContractStatus.COMPLETED) {
            throw new FreelanceConflictException("La notation est disponible uniquement après la complétion du contrat");
        }
        if (rating == null || rating < 1 || rating > 5) {
            throw new FreelanceBadRequestException("La note doit être un entier entre 1 et 5");
        }
        if (contract.getFreelancerRating() != null) {
            throw new FreelanceConflictException("Vous avez déjà noté ce client");
        }

        contract.setFreelancerRating(rating);
        contract.setFreelancerRatingComment(comment == null ? "" : comment.trim());
        appendAudit(contract, "CONTRACT_RATED freelancer->client rating=" + rating + " by " + freelancer.getEmail());
        return getContractDetailsEntity(contractRepository.save(contract));
    }

    @Transactional(readOnly = true)
    public List<FreelanceDisputeDTO> getContractDisputes(String email, Long contractId) {
        Utilisateur user = findUser(email);
        FreelanceContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new FreelanceNotFoundException("Contrat introuvable"));
        assertContractParticipant(contract, user.getId());
        return disputeRepository.findByContractId(contractId)
                .stream()
                .map(FreelanceDisputeDTO::fromEntity)
                .collect(Collectors.toList());
    }

    private FreelanceContractDTO getContractDetails(Long contractId) {
        FreelanceContract c = contractRepository.findById(contractId)
                .orElseThrow(() -> new FreelanceNotFoundException("Contrat introuvable"));
        return getContractDetailsEntity(c);
    }

    private FreelanceContractDTO getContractDetailsEntity(FreelanceContract c) {
        FreelanceContractDTO dto = FreelanceContractDTO.fromEntity(c);

        List<FreelancePayment> payments = paymentRepository.findByContractId(c.getId());
        double escrow = payments.stream().filter(p -> p.getStatus() == PaymentStatus.ESCROWED).mapToDouble(FreelancePayment::getAmount).sum();
        double released = payments.stream().filter(p -> p.getStatus() == PaymentStatus.RELEASED).mapToDouble(FreelancePayment::getAmount).sum();

        dto.setInEscrow(escrow);
        dto.setTotalPaid(released);
        return dto;
    }

    private void markMilestonesAsFunded(Long contractId) {
        List<FreelanceMilestone> milestones = milestoneRepository.findByContractId(contractId);
        FreelanceContract contract = contractRepository.findById(contractId).orElse(null);
        if (contract == null) return;
        for (FreelanceMilestone milestone : milestones) {
            if (milestone.getStatus() == MilestoneStatus.PENDING && hasAvailableEscrowForMilestone(contract, milestone.getAmount())) {
                milestone.setStatus(MilestoneStatus.FUNDED);
                milestoneRepository.save(milestone);
            }
        }
    }

    private boolean hasAvailableEscrowForMilestone(FreelanceContract contract, Double milestoneAmount) {
        if (milestoneAmount == null || milestoneAmount <= 0) return false;
        double escrowFromPayments = paymentRepository.findByContractId(contract.getId()).stream()
                .filter(p -> p.getStatus() == PaymentStatus.ESCROWED)
                .mapToDouble(FreelancePayment::getAmount)
                .sum();
        double escrowFromContract = contract.getTotalEscrow() == null ? 0.0 : contract.getTotalEscrow();
        double escrow = Math.max(escrowFromPayments, escrowFromContract);
        double reserved = milestoneRepository.findByContractId(contract.getId()).stream()
                .filter(m -> m.getStatus() == MilestoneStatus.FUNDED
                        || m.getStatus() == MilestoneStatus.SUBMITTED
                        || m.getStatus() == MilestoneStatus.APPROVED
                        || m.getStatus() == MilestoneStatus.CHANGES_REQUESTED)
                .mapToDouble(FreelanceMilestone::getAmount)
                .sum();
        return escrow - reserved >= milestoneAmount;
    }

    private FreelanceContract findReusableContract(Long missionId, Long freelancerId) {
        return contractRepository.findTopByMissionIdAndFreelancerIdOrderByCreatedAtDesc(missionId, freelancerId)
                .filter(c -> c.getStatus() != ContractStatus.CANCELLED && c.getStatus() != ContractStatus.COMPLETED)
                .orElse(null);
    }

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void autoReleaseSubmittedMilestonesAfterReviewWindow() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(14);
        List<FreelanceMilestone> staleSubmitted = milestoneRepository.findByStatusAndSubmittedAtBefore(MilestoneStatus.SUBMITTED, cutoff);
        for (FreelanceMilestone m : staleSubmitted) {
            FreelanceContract contract = m.getContract();
            double escrow = contract.getTotalEscrow() == null ? 0.0 : contract.getTotalEscrow();
            if (escrow < m.getAmount()) {
                appendAudit(contract, "AUTO_RELEASE_SKIPPED_INSUFFICIENT_ESCROW milestoneId=" + m.getId());
                contractRepository.save(contract);
                continue;
            }

            FreelancePayment payment = new FreelancePayment();
            payment.setContract(contract);
            payment.setAmount(m.getAmount());
            payment.setStatus(PaymentStatus.RELEASED);
            payment.setReleasedAt(LocalDateTime.now());
            payment.setMethod("AUTO_REVIEW_WINDOW_RELEASE");
            paymentRepository.save(payment);

            m.setStatus(MilestoneStatus.PAID);
            m.setApprovedAt(LocalDateTime.now());
            contract.setTotalEscrow(escrow - m.getAmount());
            appendAudit(contract, "MILESTONE_AUTO_RELEASED_AFTER_14_DAYS milestoneId=" + m.getId() + " amount=" + m.getAmount());

            if ((contract.getTotalEscrow() == null || contract.getTotalEscrow() <= 0.0)
                    && milestoneRepository.findByContractId(contract.getId()).stream().allMatch(ms -> ms.getId().equals(m.getId()) || ms.getStatus() == MilestoneStatus.PAID)) {
                contract.setStatus(ContractStatus.COMPLETED);
                appendAudit(contract, "CONTRACT_COMPLETED_AUTO_RELEASE");
            }

            milestoneRepository.save(m);
            contractRepository.save(contract);
        }
    }

    private String buildContractTerms(Utilisateur client, Utilisateur freelancer, Mission mission, Double amount) {
        return "UPWORK-STYLE DIGITAL AGREEMENT\n\n"
                + "Client: " + client.getNom() + "\n"
                + "Freelancer: " + freelancer.getNom() + "\n"
                + "Mission: " + mission.getTitre() + "\n"
                + "Contract Amount: " + amount + " TND\n\n"
                + "1) Scope: Freelancer delivers mission deliverables as agreed.\n"
                + "2) Milestones: Work is broken into funded milestones.\n"
                + "3) Escrow: Funds are held in escrow before release.\n"
                + "4) Revisions: Client may request revisions before approval.\n"
                + "5) Disputes: Parties can open dispute with evidence notes.\n"
                + "6) Digital Signature: Acceptance by both parties is legally binding.";
    }

    private void validateAmount(Double amount) {
        if (amount == null || amount <= 0) {
            throw new FreelanceBadRequestException("Le montant doit être supérieur à 0");
        }
    }

    private void assertRoomParticipant(FreelanceChatRoom room, Long userId) {
        boolean isClient = room.getClient() != null && userId.equals(room.getClient().getId());
        boolean isFreelancer = room.getFreelancer() != null && userId.equals(room.getFreelancer().getId());
        if (!isClient && !isFreelancer) {
            throw new FreelanceAccessDeniedException("Accès au salon refusé");
        }
    }

    private void assertContractParticipant(FreelanceContract contract, Long userId) {
        boolean isClient = contract.getClient() != null && userId.equals(contract.getClient().getId());
        boolean isFreelancer = contract.getFreelancer() != null && userId.equals(contract.getFreelancer().getId());
        if (!isClient && !isFreelancer) {
            throw new FreelanceAccessDeniedException("Accès au contrat refusé");
        }
    }

    private void assertContractClient(FreelanceContract contract, Long userId) {
        if (contract.getClient() == null || !userId.equals(contract.getClient().getId())) {
            throw new FreelanceAccessDeniedException("Action réservée au client");
        }
    }

    private void assertContractFreelancer(FreelanceContract contract, Long userId) {
        if (contract.getFreelancer() == null || !userId.equals(contract.getFreelancer().getId())) {
            throw new FreelanceAccessDeniedException("Action réservée au freelancer");
        }
    }

    private void appendAudit(FreelanceContract contract, String entry) {
        String prev = contract.getAuditTrail() == null ? "" : contract.getAuditTrail() + "\n";
        contract.setAuditTrail(prev + "[" + LocalDateTime.now() + "] " + entry);
    }
}
