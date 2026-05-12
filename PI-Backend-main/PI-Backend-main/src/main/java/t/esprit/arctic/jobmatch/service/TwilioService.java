package t.esprit.arctic.jobmatch.service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import t.esprit.arctic.jobmatch.entity.Utilisateur;
import t.esprit.arctic.jobmatch.exception.ResourceNotFoundException;
import t.esprit.arctic.jobmatch.repository.UtilisateurRepository;

import java.util.Random;

@Service
@RequiredArgsConstructor
public class TwilioService {

    @Value("${twilio.enabled:false}")
    private boolean twilioEnabled;

    @Value("${twilio.account.sid:}")
    private String accountSid;

    @Value("${twilio.auth.token:}")
    private String authToken;

    @Value("${twilio.messaging.service.sid:}")
    private String messagingServiceSid;

    @Value("${twilio.country.code:+216}")
    private String countryCode;

    @Value("${twilio.from.phone:}")
    private String fromPhone;

    private final UtilisateurRepository utilisateurRepository;

    // Format phone number to E.164 format (required by Twilio)
    // Example: 96075069 -> +21696075069
    private String formatPhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
            throw new RuntimeException("Numéro de téléphone vide");
        }

        // Remove spaces, dashes, parentheses
        phoneNumber = phoneNumber.replaceAll("[\\s\\-()]+", "");

        // If already in international format (starts with +), return as-is
        if (phoneNumber.startsWith("+")) {
            return phoneNumber;
        }

        // If starts with 0 (local format), remove it and add country code
        if (phoneNumber.startsWith("0")) {
            phoneNumber = phoneNumber.substring(1);
        }

        // Append country code
        return countryCode + phoneNumber;
    }

    // Generate a random 6-digit code
    private String generateOTP() {
        Random random = new Random();
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }

    // Generate a random strong password
    public String generateRandomPassword() {
        String upperCase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        String lowerCase = "abcdefghijklmnopqrstuvwxyz";
        String numbers = "0123456789";
        String specialChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";
        
        String allChars = upperCase + lowerCase + numbers + specialChars;
        Random random = new Random();
        int passwordLength = 12 + random.nextInt(5); // 12-16 characters
        
        StringBuilder password = new StringBuilder();
        
        // Ensure password has at least one of each type
        password.append(upperCase.charAt(random.nextInt(upperCase.length())));
        password.append(lowerCase.charAt(random.nextInt(lowerCase.length())));
        password.append(numbers.charAt(random.nextInt(numbers.length())));
        password.append(specialChars.charAt(random.nextInt(specialChars.length())));
        
        // Fill the rest randomly
        for (int i = 4; i < passwordLength; i++) {
            password.append(allChars.charAt(random.nextInt(allChars.length())));
        }
        
        // Shuffle the password
        String[] chars = password.toString().split("");
        for (int i = chars.length - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            String temp = chars[i];
            chars[i] = chars[j];
            chars[j] = temp;
        }
        
        return String.join("", chars);
    }

    // Generate new password and send via SMS
    public String sendNewPasswordBySMS(String phoneNumber) {
        try {
            if (!twilioEnabled || accountSid == null || accountSid.isBlank()) {
                throw new RuntimeException("SMS (Twilio) is not configured. Set twilio.enabled=true and Twilio credentials.");
            }
            // Find user by phone number (returns Optional<Utilisateur>)
            Utilisateur user = utilisateurRepository.findByPhoneNumber(phoneNumber)
                    .orElseThrow(() -> new RuntimeException("Aucun utilisateur trouvé avec ce numéro de téléphone"));

            System.out.println("[SMS] ✅ Found user: " + user.getNom() + " " + user.getEmail());

            // Format phone number to E.164 format for Twilio
            String formattedPhone = formatPhoneNumber(phoneNumber);
            System.out.println("[SMS] Original: " + phoneNumber + " -> Formatted: " + formattedPhone);

            // Generate new strong password
            String newPassword = generateRandomPassword();

            // Initialize Twilio
            Twilio.init(accountSid, authToken);

            // Message body
            String messageBody = "Votre nouveau mot de passe JobMatch est: " + newPassword + 
                                 "\nVeuillez vous connecter et le changer immédiatement.";

            // Create message using friend's Messaging Service with valid Long Code sender
            Message message = Message.creator(
                    new PhoneNumber(formattedPhone),        // To number (in E.164 format)
                    new PhoneNumber(fromPhone),             // From: friend's valid Long Code
                    messageBody                             // Message body
            )
            .setMessagingServiceSid(messagingServiceSid)    // Use friend's Messaging Service
            .create();

            System.out.println("✅ SMS avec nouveau mot de passe envoyé à: " + formattedPhone);
            System.out.println("✅ SMS SID: " + message.getSid());

            // Return the new password so controller can update the database
            return newPassword;

        } catch (Exception e) {
            System.err.println("[SMS ERROR] " + e.getMessage());
            throw new RuntimeException("Erreur lors de l'envoi du SMS: " + e.getMessage(), e);
        }
    }

    // Verify OTP (to be implemented when user submits code)
    public boolean verifyOTP(String phoneNumber, String otp) {
        // TODO: Implement OTP verification logic
        // Check if OTP matches and hasn't expired
        return true;
    }

}
