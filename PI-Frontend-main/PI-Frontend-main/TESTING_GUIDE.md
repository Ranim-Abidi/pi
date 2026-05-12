# 📋 GUIDE COMPLET DE TEST - OFFRE STATISTIQUES

## 🏗️ Structure des tests

```
Backend (Spring Boot)
├── Tests Unitaires (JUnit + Mockito)
│   └── OffreStatistiquesServiceTest.java
└── Tests API (Postman/Curl)

Frontend (Angular)
├── Tests Unitaires (Jasmine/Karma)
│   └── offre-statistiques.component.spec.ts
├── Tests du Service
│   └── offre-statistiques.service.spec.ts
└── Tests E2E (Cypress)
    ├── offre-statistiques.cy.ts
    └── Fixtures JSON
```

---

## 🚀 ÉTAPE 1 : Tests Backend

### 1.1 Démarrer le backend
```bash
# Terminal 1 - Backend
cd C:\Users\user\IdeaProjects\jobmatch
mvn spring-boot:run
# Ou si Maven n'est pas configuré, utiliser l'IDE IntelliJ pour Run
```

### 1.2 Tests Unitaires (JUnit)
```bash
# Exécuter tous les tests
mvn test

# Ou exécuter un test spécifique
mvn test -Dtest=OffreStatistiquesServiceTest

# Avec rapport de couverture
mvn test jacoco:report

# Afficher le rapport
Start target/site/jacoco/index.html
```

### 1.3 Tests API avec Postman
Importer la collection Postman suivante :

**1️⃣ GET - Toutes les offres**
```
GET http://localhost:8080/api/offres-stats/all
Headers: Content-Type: application/json
Expected Status: 200
```

**2️⃣ GET - Offres par recruteur**
```
GET http://localhost:8080/api/offres-stats/recruiter/1
Headers: Content-Type: application/json
Expected Status: 200
```

**3️⃣ GET - Offres par salaire**
```
GET http://localhost:8080/api/offres-stats/salary?min=50&max=150&minCandidatures=5
Headers: Content-Type: application/json
Expected Status: 200
```

**4️⃣ GET - Top offres**
```
GET http://localhost:8080/api/offres-stats/top?limit=10
Headers: Content-Type: application/json
Expected Status: 200
```

### 1.4 Tests API avec curl
```bash
# Test 1: Toutes les offres
curl -X GET "http://localhost:8080/api/offres-stats/all" \
  -H "Content-Type: application/json" | jq .

# Test 2: Offres d'un recruteur
curl -X GET "http://localhost:8080/api/offres-stats/recruiter/1" \
  -H "Content-Type: application/json" | jq .

# Test 3: Filtrer par salaire
curl -X GET "http://localhost:8080/api/offres-stats/salary?min=50&max=150&minCandidatures=0" \
  -H "Content-Type: application/json" | jq .

# Test 4: Top offres
curl -X GET "http://localhost:8080/api/offres-stats/top?limit=10" \
  -H "Content-Type: application/json" | jq .
```

---

## 🎨 ÉTAPE 2 : Tests Frontend

### 2.1 Démarrer le frontend
```bash
# Terminal 2 - Frontend
cd "C:\Users\user\Desktop\projet integré\themeforest-OmXxesDy-jove-angular-job-board-template\jove"
npm start
# Ou
ng serve
# L'app s'ouvre sur http://localhost:4200
```

### 2.2 Tests Unitaires Jasmine/Karma
```bash
# Exécuter les tests Jasmine
ng test

# Ou avec npm
npm run test

# Afficher la couverture
ng test --code-coverage

# Afficher le rapport
open coverage/index.html
```

**Résultat attendu:**
```
✓ should create
✓ should load all offres on init
✓ should load recruiter offres
✓ should filter by salary range
✓ should load top offres
✓ should format date correctly
✓ should calculate acceptance rate correctly
✓ should assign correct CSS class
✓ should handle error when loading offres
✓ should display error message when recruiter ID is missing
✓ should unsubscribe on destroy

11 specs, 0 failures
```

### 2.3 Visiter le composant manuellement
```bash
# Dans le navigateur
1. Aller à http://localhost:4200/recruiter-dashboard
2. Vérifier que le composant "offre-statistiques" s'affiche
3. Vérifier que les données se chargent
4. Tester les filtres manuellement
```

---

## 🧪 ÉTAPE 3 : Tests E2E Cypress

### 3.1 Installer Cypress (si non installé)
```bash
npm install --save-dev cypress

# Ou
cd jove
npm install cypress
```

### 3.2 Configurer Cypress
```bash
# Ouvrir Cypress UI
npx cypress open

# Ou en mode headless
npx cypress run --spec "cypress/e2e/offre-statistiques.cy.ts"
```

### 3.3 Exécuter les tests E2E
```bash
# Mode interactif
npx cypress open

# Mode headless (pour CI/CD)
npx cypress run

# Test un fichier spécifique
npx cypress run --spec "cypress/e2e/offre-statistiques.cy.ts"

# Test avec brower spécifique
npx cypress run --browser chrome

# Générer un rapport
npx cypress run --reporter json
```

**Résultats attendus:**
```
✓ should display statistiques component
✓ should load all offres on page load
✓ should filter offres by recruiter
✓ should filter offres by salary range
✓ should load top offres
✓ should display error message on API failure
✓ should show loading state while fetching data
✓ should display correct acceptance rate
✓ should apply correct CSS class based on candidatures count
✓ should display empty message when no results
✓ should validate recruiter ID requirement
✓ should properly format dates in table
✓ should handle filter button clicks correctly
✓ should maintain state during filter changes

14 passing
```

---

## 📊 Matrice de test complète

| Test Type | Outil | Commande | Status |
|-----------|-------|----------|--------|
| Backend - Unitaire | JUnit/Mockito | `mvn test` | ✅ |
| Backend - API | cURL/Postman | `curl http://...` | ✅ |
| Frontend - Unitaire | Jasmine/Karma | `ng test` | ✅ |
| Frontend - Service | Jasmine | `ng test` | ✅ |
| Frontend - E2E | Cypress | `npx cypress run` | ✅ |

---

## 🔍 Cas de test critiques

### Backend
- [ ] Récupération de 100+ offres sans timeout
- [ ] Filtrage par salaire avec données nulles
- [ ] Calcul correct du taux d'acceptation
- [ ] Limite de résultats (TOP 10, 20, 50)
- [ ] Gestion des recruteurs sans offres
- [ ] Performance des jointures JPQL

### Frontend
- [ ] Affichage du loader pendant le chargement
- [ ] Gestion des erreurs réseau
- [ ] Validation du formulaire (ID recruteur)
- [ ] Formatage des dates selon locale (fr-FR)
- [ ] Couleurs CSS dynamiques basées sur counts
- [ ] Cleanup RxJS (takeUntil + destroy$)

### E2E
- [ ] Navigation entre les filtres
- [ ] Persistence des données lors du scroll
- [ ] Responsive design (mobile)
- [ ] Accessibilité (labels, aria-labels)
- [ ] Performance du tableau (1000+ lignes)

---

## 📈 Code Coverage

```bash
# Générer rapport de couverture complet
ng test --code-coverage --watch=false

# Frontend report
open coverage/jove/index.html

# Backend report
open target/site/jacoco/index.html

# Objectifs de couverture
- Statements: 80%+
- Branches: 75%+
- Functions: 80%+
- Lines: 80%+
```

---

## 🐛 Debugging

### Debug Backend
```java
// Dans OffreStatistiquesService
@Transactional
public List<OffreStatistiquesDTO> getOffresAvecStatistiques() {
    log.debug("JPQL Query executed");
    log.debug("Results: {}", offres.size());
    return offres;
}

// Afficher les logs
tail -f target/logs/application.log
```

### Debug Frontend
```typescript
// Dans le composant
loadAllOffres(): void {
    console.log('Loading all offres...');
    this.offreStatistiquesService.getOffresAvecStatistiques()
      .subscribe({
        next: (data) => {
          console.log('Data loaded:', data);
        },
        error: (error) => {
          console.error('Error:', error);
        }
      });
}

// Devtools (F12)
- Network tab pour voir les requêtes
- Console pour les erreurs
- Elements pour inspecter le DOM
```

### Debug E2E Cypress
```bash
# Mode headless avec debugging
DEBUG=cypress:* npx cypress run

# Ajouter des commandes d'attente
cy.log('État du composant');
cy.debug();
```

---

## ✅ Checklist de test

- [ ] Backend démarre sans erreurs
- [ ] Toutes les migrations DB sont appliquées
- [ ] 3+ recruteurs avec offres créés en DB
- [ ] Tests JUnit passent à 100%
- [ ] Tous les endpoints API retournent 200
- [ ] Fronend démarre sans console errors
- [ ] Tests Jasmine passent à 100%
- [ ] Tests E2E Cypress passent à 100%
- [ ] Aucune requête HTTP en attente dans les tests
- [ ] Code coverage > 80%
- [ ] Performance: < 200ms par requête API
- [ ] UI responsive (testé sur mobile, tablet, desktop)

---

## 📞 Troubleshooting

### Erreur: "Cannot find module 'OffreStatistiquesDTO'"
```bash
# Vérifier l'import
import t.esprit.arctic.jobmatch.dto.OffreStatistiquesDTO;

# Recompiler
mvn clean compile
```

### Erreur: "404 Not Found" sur /api/offres-stats/all
```bash
# Vérifier que le backend démarre
curl http://localhost:8080/actuator/health

# Vérifier le contrôleur est scanné
@RestController
@RequestMapping("/api/offres-stats")
```

### Erreur: "TypeError: Cannot read property 'map' of undefined"
```typescript
// Vérifier l'initialisation dans le composant
offres: OffreStatistiques[] = [];
filteredOffres: OffreStatistiques[] = [];
```

### Erreur: "RxJS Unsubscribe Warning"
```typescript
// Vérifier que ngOnDestroy existe
ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}
```

---

## 🎯 Prochaines étapes

1. ✅ Tests passent
2. → Déployer en staging
3. → Monitoring + logs en production
4. → A/B testing sur perf
5. → Feedback utilisateurs
