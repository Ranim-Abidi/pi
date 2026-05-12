# 📚 GUIDE D'INSTALLATION ET CONFIGURATION

## ÉTAPE 1: Configuration Backend Email

### Option A: Gmail
1. Activez l'authentification 2FA sur votre compte Gmail
2. Générez un mot de passe d'application: https://myaccount.google.com/apppasswords
3. Dans `src/main/resources/application.properties`:

```properties
# Email Configuration - Gmail
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=votre-email@gmail.com
spring.mail.password=votre-mot-de-passe-app
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
spring.mail.properties.mail.smtp.starttls.required=true
```

### Option B: Outlook/Office365
```properties
spring.mail.host=smtp.office365.com
spring.mail.port=587
spring.mail.username=votre-email@outlook.com
spring.mail.password=votre-mot-de-passe
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
```

### Option C: SendGrid (Service Email Professionnel)
```properties
spring.mail.host=smtp.sendgrid.net
spring.mail.port=587
spring.mail.username=apikey
spring.mail.password=SG.votre-api-key
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
```

---

## ÉTAPE 2: Base de Données

### Créer la table Messages
Exécuter ce script SQL:

```sql
-- Création de la table messages
CREATE TABLE messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    subject VARCHAR(255) NOT NULL,
    contenu LONGTEXT,
    sender_email VARCHAR(255),
    sender_name VARCHAR(255),
    candidat_id BIGINT,
    candidature_id BIGINT,
    date_envoi DATETIME DEFAULT CURRENT_TIMESTAMP,
    lu BOOLEAN DEFAULT FALSE,
    type VARCHAR(50),
    
    -- Clés étrangères
    FOREIGN KEY (candidat_id) REFERENCES candidats(id) ON DELETE CASCADE,
    FOREIGN KEY (candidature_id) REFERENCES candidatures(id) ON DELETE CASCADE,
    
    -- Index pour les performances
    INDEX idx_candidat_id (candidat_id),
    INDEX idx_candidature_id (candidature_id),
    INDEX idx_date_envoi (date_envoi),
    INDEX idx_lu (lu),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vérifier la création
DESC messages;
SELECT * FROM messages LIMIT 1;
```

### Mettre à jour Candidat Entity (si nécessaire)
Vérifiez que l'entité `Candidat` a les champs:
- `id`
- `email`
- `nom`

---

## ÉTAPE 3: Compilation et Tests

### Backend
```bash
# Naviguer au projet backend
cd C:\Users\user\IdeaProjects\jobmatch

# Compiler
mvn clean compile

# Run les tests
mvn test

# Démarrer l'application
mvn spring-boot:run
# OU directement dans IntelliJ: Run > Run 'JobmatchApplication'
```

**Verifient l'application démarre sur:** `http://localhost:8080`

### Frontend
```bash
# Naviguer au projet frontend
cd "C:\Users\user\Desktop\projet integré\themeforest-OmXxesDy-jove-angular-job-board-template\jove"

# Installer les dépendances (si pas fait)
npm install

# Développement
ng serve --open
# Application ouvrira sur: http://localhost:4200

# Ou compilation production
ng build
```

---

## ÉTAPE 4: Test Manuel du Workflow Complet

### Test 1: Connexion et Visualisation des Candidatures

```
1. Ouvrez: http://localhost:4200
2. Connectez-vous avec un compte RECRUTEUR
3. Allez à: /recruiter-dashboard/candidatures
   URL complète: http://localhost:4200/recruiter-dashboard/candidatures
4. Vous devriez voir la liste de toutes les candidatures
```

### Test 2: Accepter une Candidature

```
1. Dans la liste des candidatures, trouvez une avec statut "EN_ATTENTE"
2. Cliquez sur "Accepter"
3. Confirmez la boîte de dialogue
4. Attendez 2-3 secondes
5. Vous verrez un message de succès
6. L'email sera envoyé au candidat
```

### Test 3: Consulter la Boîte Mail du Candidat

```
1. Déconnectez-vous
2. Connectez-vous avec un compte CANDIDAT
3. Allez à: /candidates-dashboard/mailbox
   URL complète: http://localhost:4200/candidates-dashboard/mailbox
4. Vous devriez voir le message "Bonne nouvelle - Votre candidature a été acceptée!"
5. Cliquez sur le message pour voir les détails
6. Le message devient "Lu"
```

### Test 4: Email Reçu

```
1. Vérifiez la boîte email du candidat
2. Vous recevrez un email de noreply@jobmatch.com
3. Sujet: "Bonne nouvelle - Votre candidature a été acceptée!"
4. Le contenu inclut le numéro de la candidature
```

---

## ÉTAPE 5: Configuration de Sécurité (Optional mais Recommandé)

### Configurer l'autorisation des emails
Ajouter dans SecurityConfig:

```java
// Permet aux recruteurs d'envoyer des emails
if (hasRole("ROLE_RECRUTEUR") || hasRole("ROLE_ADMIN")) {
    // Les messages peuvent être envoyés
}
```

### CORS Configuration (si nécessaire)
Dans `application.properties`:
```properties
# CORS pour Angular dev
server.servlet.session.cookie.secure=false
server.servlet.session.cookie.same-site=lax
```

---

## ÉTAPE 6: Logs et Debugging

### Activer les logs détaillés
Ajouter dans `application.properties`:

```properties
# Logs de l'application
logging.level.root=INFO
logging.level.t.esprit.arctic.jobmatch=DEBUG

# Logs de l'email
logging.level.org.springframework.mail=DEBUG

# Logs de la sécurité
logging.level.org.springframework.security=DEBUG
```

### Voir les logs en temps réel (Backend)
```bash
# Dans le terminal du Maven
tail -f server.log
```

### Voir les logs en temps réel (Frontend)
```bash
# F12 > Console tab dans le navigateur
# Vous verrez les requêtes HTTP et les erreurs
```

---

## ÉTAPE 7: Troubleshooting

### Erreur: "Connection refused"
```
❌ Problème: Backend ne démarre pas
✅ Solution:
   - Vérifiez port 8080 est libre
   - Vérifiez MySql est en cours d'exécution
   - Vérifiez la configuration BD dans application.properties
```

### Erreur: "Email failed"
```
❌ Problème: Les emails ne s'envoient pas
✅ Solution:
   - Vérifiez configuration Gmail/Outlook/SendGrid
   - Vérifiez le mot de passe est correct
   - Vérifiez la sécurité firewall
   - Essayez dans une autre application email d'abord
```

### Erreur: "Candidat not found"
```
❌ Problème: L'email du candidat n'existe pas
✅ Solution:
   - Vérifiez que le candidat s'est enregistré
   - Vérifiez que l'email dans la BD est correct
   - Vérifiez les logs: "SELECT * FROM candidats WHERE email = ?"
```

### Erreur: "Message table not found"
```
❌ Problème: La table messages n'existe pas
✅ Solution:
   - Exécutez le script SQL ci-dessus
   - Vérifiez: SHOW TABLES;
```

---

## ÉTAPE 8: Optimisations Production

### Sauvegardes Email
Si vous ne pouvez pas envoyer d'emails, au minimum les messages sont sauvegardés.
Mettez en place une cronjob pour renvoyer:

```sql
-- Trouver les messages d'erreur
SELECT * FROM messages WHERE DATE(date_envoi) = CURDATE() LIMIT 10;
```

### Rate Limiting (Optionnel)
Ajouter un contrôle contre les abus:

```java
@RateLimiter(limit = 10, duration = "1m")
public ResponseEntity<?> envoyerEmail(...) {
    // Limiter à 10 emails par minute par utilisateur
}
```

### Caching
Mettre en cache les messages:

```java
@Cacheable("messages")
public List<MessageDTO> getMessagesForCandidat(Long candidatId) {
    // ...
}
```

---

## ÉTAPE 9: Déploiement

### Docker (Optionnel)
Créer `Dockerfile` dans le backend:

```dockerfile
FROM openjdk:17
COPY target/jobmatch-*.jar app.jar
ENTRYPOINT ["java","-jar","/app.jar"]
```

### Cloud (Heroku, AWS, Azure)
Les configurations par défaut marchent sur le cloud.
Juste besoin de:
1. Database du cloud (CloudSQL, RDS, etc.)
2. Service email du cloud (SendGrid, etc.)

---

## 📞 SUPPORT

En cas de problème:
1. Vérifiez les logs
2. Vérifiez la configuration email
3. Testez la connexion BD
4. Testez l'authentification JWT
5. Consultez: https://spring.io/projects/spring-boot

---

**Bonne chance! 🚀**
