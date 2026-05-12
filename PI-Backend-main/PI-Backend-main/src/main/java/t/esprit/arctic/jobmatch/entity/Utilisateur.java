package t.esprit.arctic.jobmatch.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Inheritance(strategy = InheritanceType.JOINED)
public class Utilisateur {

        @Id
        @GeneratedValue
        private Long id;

        private String nom;

        @Column(unique = true)
        private String email;

        private String motDePasse;

        @Enumerated(EnumType.STRING)
        private Role role;

        @JsonIgnore
        private LocalDateTime dateCreation;

        private boolean actif;

        @Column(columnDefinition = "TEXT")
        private String followers;

        // Login history for this user
        @JsonIgnore
        @OneToMany(mappedBy = "utilisateur", cascade = CascadeType.ALL, orphanRemoval = true)
        private java.util.List<LoginHistory> loginHistories = new java.util.ArrayList<>();

        // Getters explicites pour Lombok
        public String getEmail() {
                return email;
        }

        public String getMotDePasse() {
                return motDePasse;
        }

        public Role getRole() {
                return role;
        }

        public Long getId() {
                return id;
        }
}