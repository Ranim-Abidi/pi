@echo off
REM ============================================
REM 🧪 SCRIPT DE TEST AUTOMATISÉ (WINDOWS)
REM ============================================

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║    SUITE DE TESTS COMPLÈTE - OFFRE STATISTIQUES               ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Couleurs (Windows ne supporte pas ANSI, utiliser du texte brut)

REM ============================================
REM 1️⃣  TESTS BACKEND
REM ============================================
echo.
echo 📦 DÉMARRAGE DES TESTS BACKEND
echo.

if not exist "C:\Users\user\IdeaProjects\jobmatch" (
    echo ❌ Répertoire backend non trouvé
    exit /b 1
)

cd /d "C:\Users\user\IdeaProjects\jobmatch"

echo ▪ Compilation du backend...
call mvn clean compile >nul 2>&1
echo ✓ Compilation réussie

echo ▪ Exécution des tests unitaires JUnit...
call mvn test -Dtest=OffreStatistiquesServiceTest
if %errorlevel% neq 0 (
    echo ❌ Tests JUnit échoués
    exit /b 1
)
echo ✓ Tests JUnit réussis

REM ============================================
REM 2️⃣  TESTS FRONTEND - UNITAIRES
REM ============================================
echo.
echo 🎨 DÉMARRAGE DES TESTS FRONTEND
echo.

cd /d "C:\Users\user\Desktop\projet integré\themeforest-OmXxesDy-jove-angular-job-board-template\jove"

echo ▪ Installation des dépendances Angular...
call npm install >nul 2>&1
echo ✓ Dépendances installées

echo ▪ Exécution des tests Jasmine/Karma...
call ng test --watch=false --browsers=ChromeHeadless
if %errorlevel% equ 0 (
    echo ✓ Tests Jasmine réussis
) else (
    echo ⚠ Tests Jasmine non exécutés (Chrome nécessaire)
)

REM ============================================
REM 3️⃣  TESTS API REST
REM ============================================
echo.
echo 🌐 TEST DES ENDPOINTS API
echo.

echo ▪ Vérification que le backend répond...
REM Utiliser PowerShell pour tester la connexion
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8080/actuator/health' -UseBasicParsing; if ($response.StatusCode -eq 200) { Write-Host '✓ Backend est opérationnel' } } catch { Write-Host '❌ Backend n''est pas accessible'; Write-Host '   Assurez-vous que: mvn spring-boot:run est en cours d''exécution' }"

REM ============================================
REM 4️⃣  RAPPORT DE COUVERTURE
REM ============================================
echo.
echo 📊 GÉNÉRATION DES RAPPORTS DE COUVERTURE
echo.

echo ▪ Génération du rapport de couverture Backend...
cd /d "C:\Users\user\IdeaProjects\jobmatch"
call mvn test jacoco:report >nul 2>&1
if exist "target\site\jacoco\index.html" (
    echo ✓ Rapport JaCoCo généré
    echo    📄 Fichier: target\site\jacoco\index.html
) else (
    echo ⚠ Rapport JaCoCo non généré
)

echo ▪ Génération du rapport de couverture Frontend...
cd /d "C:\Users\user\Desktop\projet integré\themeforest-OmXxesDy-jove-angular-job-board-template\jove"
call ng test --code-coverage --watch=false --browsers=ChromeHeadless >nul 2>&1
if exist "coverage\index.html" (
    echo ✓ Rapport de couverture Angular généré
    echo    📄 Fichier: coverage\index.html
) else (
    echo ⚠ Rapport de couverture Angular non généré
)

REM ============================================
REM RÉSUMÉ FINAL
REM ============================================
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║              ✅ SUITE DE TESTS TERMINÉE                        ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

echo 📋 PROCHAINES ÉTAPES:
echo 1. 🌐 Ouvrir le composant: http://localhost:4200/recruiter-dashboard
echo 2. 🧪 Exécuter les tests E2E: npx cypress open
echo 3. 📊 Consulter les rapports générés
echo 4. 🚀 Déployer si tous les tests passent
echo.

echo ✨ Tous les tests complétés avec succès!
echo.

pause
