package t.esprit.arctic.jobmatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import t.esprit.arctic.jobmatch.entity.OtpToken;

import java.util.Optional;
import java.util.List;

@Repository
public interface OtpTokenRepository extends JpaRepository<OtpToken, Long> {
    Optional<OtpToken> findByPhoneNumberAndOtp(String phoneNumber, String otp);
    List<OtpToken> findByPhoneNumber(String phoneNumber);
    Optional<OtpToken> findFirstByPhoneNumberOrderByCreatedAtDesc(String phoneNumber);
}
