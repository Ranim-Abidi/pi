# Guide de vérification du Login et du JWT

## Étapes à suivre pour vérifier que le login fonctionne correctement avec redirection

### 1. Redémarrer le serveur
- Arrêtez le serveur Spring Boot précédent (Ctrl+C)
- Lancez le serveur avec la nouvelle build :
  ```
  cd C:\Users\user\IdeaProjects\jobmatch
  .\mvnw.cmd spring-boot:run
  ```

### 2. Recharger l'application Angular
- Ouvrir http://localhost:4200 dans le navigateur
- Appuyer sur F5 pour forcer le rechargement (vider le cache)

### 3. Test du JWT avec Postman (optionnel mais recommandé)
Pour vérifier que le JWT inclut bien le rôle, utilisez Postman :

**Endpoint TEST JWT:**
- URL: `http://localhost:8080/api/auth/test-jwt`
- Méthode: POST
- Body (JSON):
```json
{
  "email": "recruteur@test.com",
  "motDePasse": "password123"
}
```
- Vous devez recevoir:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "email": "recruteur@test.com",
  "role": "RECRUTEUR",
  "message": "JWT généré avec succès"
}
```

### 4. Test du Login depuis Angular
1. Cliquez sur le bouton Login dans la navbar
2. Entrez les identifiants :
   - Email: `recruteur@test.com` (ou tout compte RECRUTEUR)
   - Mot de passe: `password123` (ou le mot de passe du compte)
3. Cliquez sur "Login Now"

### 5. Vérification dans la console du navigateur (F12)
Vous devriez voir :
- ✅ "Tentative de connexion Object"
- ✅ "Login successful Object"
- ✅ "Token decoded: ..." (sans erreur)
- ✅ "Role from response: RECRUTEUR"
- ✅ "Extracted role: RECRUTEUR"
- ✅ "Normalized role: RECRUTEUR"

### 6. Vérification de la redirection
Après le login réussi :
- L'URL actuelle doit devenir : `http://localhost:4200/recruteur-dashboard`
- Ou selon votre logique : `/candidat-dashboard`, `/admin-dashboard`, etc.

## Notes importantes

### Si le JWT n'est pas généré (erreur "Invalid token specified"):
- Vérifiez que l'utilisateur existe en base de données
- Vérifiez que le mot de passe est correct
- Vérifiez les logs du serveur (console Spring Boot)

### Si l'authentification échoue ("Email ou mot de passe incorrect"):
- Vérifiez que vous utilisez un email valide d'un utilisateur existant
- Vérifiez que le mot de passe est correct
- Vérifiez que le compte est marqué comme "actif" (actif = true)

### Si la redirection ne fonctionne pas:
- Vérifiez que le rôle est bien présent dans la réponse du backend
- Vérifiez la logique de redirection côté Angular (navbar.component.ts)
- Vérifiez que les routes Angular sont correctement définie (/recruteur-dashboard, etc.)

## Endpoints disponibles

- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion (retourne le JWT avec le rôle)
- `POST /api/auth/test-jwt` - Test de génération du JWT (pour debug)
- `GET /api/auth/test-role` - Test du rôle authentifié (nécessite d'être authentifié)

