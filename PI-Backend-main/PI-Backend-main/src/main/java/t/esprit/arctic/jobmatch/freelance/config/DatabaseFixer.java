package t.esprit.arctic.jobmatch.freelance.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class DatabaseFixer {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void fixDatabaseColumns() {
        log.info("Applying database fixes for freelance module...");
        // Normalize legacy values first to avoid enum migration truncation errors.
        safeExecute("ALTER TABLE freelance_payment MODIFY status ENUM('PENDING_ESCROW','FAILED','ESCROW','RELEASED','REFUNDED','INITIATED','ESCROWED') NOT NULL");
        safeExecute("UPDATE freelance_payment SET status='ESCROWED' WHERE status='ESCROW'");
        safeExecute("UPDATE freelance_payment SET status='INITIATED' WHERE status='PENDING_ESCROW'");
        safeExecute("ALTER TABLE freelance_milestone MODIFY status ENUM('PENDING','ACTIVE','COMPLETED','APPROVED','PAID','REVISION','FUNDED','SUBMITTED','CHANGES_REQUESTED') NOT NULL");
        safeExecute("UPDATE freelance_milestone SET status='FUNDED' WHERE status='ACTIVE'");
        safeExecute("UPDATE freelance_milestone SET status='SUBMITTED' WHERE status='COMPLETED'");

        safeExecute("ALTER TABLE freelance_contract MODIFY client_signature LONGTEXT");
        safeExecute("ALTER TABLE freelance_contract MODIFY freelancer_signature LONGTEXT");
        safeExecute("ALTER TABLE fl_candidatures MODIFY statut ENUM('EN_ATTENTE','SHORTLISTEE','ACCEPTEE','REJETEE') NOT NULL");
        safeExecute("ALTER TABLE freelance_milestone MODIFY status ENUM('PENDING','FUNDED','SUBMITTED','CHANGES_REQUESTED','APPROVED','PAID','REVISION') NOT NULL");
        safeExecute("ALTER TABLE freelance_payment MODIFY status ENUM('INITIATED','FAILED','ESCROWED','RELEASED','REFUNDED') NOT NULL");
        safeExecute("ALTER TABLE freelance_contract MODIFY status ENUM('DRAFT','PROPOSED','ACTIVE','PAUSED','COMPLETED','CANCELLED','DISPUTED') NOT NULL");
        log.info("Freelance database fixer completed.");
    }

    private void safeExecute(String sql) {
        try {
            jdbcTemplate.execute(sql);
        } catch (Exception e) {
            log.warn("Skipped SQL migration step: {} | reason: {}", sql, e.getMessage());
        }
    }
}
