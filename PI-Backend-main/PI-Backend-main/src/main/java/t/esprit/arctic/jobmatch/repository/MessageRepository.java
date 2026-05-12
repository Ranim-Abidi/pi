package t.esprit.arctic.jobmatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import t.esprit.arctic.jobmatch.entity.Message;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByCandidatIdOrderByDateEnvoiDesc(Long candidatId);
    List<Message> findByCandidatIdAndLuFalseOrderByDateEnvoiDesc(Long candidatId);
    long countByCandidatIdAndLuFalse(Long candidatId);
    List<Message> findBySenderEmailOrderByDateEnvoiDesc(String senderEmail);
    List<Message> findByReceiverEmailOrderByDateEnvoiDesc(String receiverEmail);
    List<Message> findBySenderEmailOrReceiverEmailOrderByDateEnvoiDesc(String senderEmail, String receiverEmail);
    List<Message> findByReceiverEmailAndLuFalseOrderByDateEnvoiDesc(String receiverEmail);
    long countByReceiverEmailAndLuFalse(String receiverEmail);
}
