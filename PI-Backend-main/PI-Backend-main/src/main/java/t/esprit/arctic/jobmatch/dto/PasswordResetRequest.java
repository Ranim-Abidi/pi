package t.esprit.arctic.jobmatch.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PasswordResetRequest {
    private String phone;

    // Getter for backward compatibility (if needed)
    public String getPhoneNumber() {
        return this.phone;
    }
}
