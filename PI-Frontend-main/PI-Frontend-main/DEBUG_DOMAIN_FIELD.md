# Debug Guide: Domain Field Error

## Problem
Backend is receiving an empty value for the domain field despite client-side validation passing, causing error 500: "Le domaine est obligatoire"

## Solution Steps

### Step 1: Open Browser Developer Console
1. Open your browser (Chrome, Firefox, Edge, Safari)
2. Press **F12** or **Right-click → Inspect** to open Developer Tools
3. Click on the **Console** tab

### Step 2: Navigate to the Question Form
1. Go to Recruiter Dashboard
2. Open an Interview to add questions
3. Keep the Developer Console visible (F12)

### Step 3: Submit the Form with Logging
1. **Fill Out the Form:**
   - Content: Enter at least 10 characters
   - Type: Select "QCM", "QCU", or "VRAI_FAUX"
   - Domain: **SELECT A DOMAIN FROM THE DROPDOWN**
   - Level: Select "DEBUTANT", "INTERMEDIAIRE", "AVANCE", or "EXPERT"
   - Responses: Add at least 2 responses if not VRAI_FAUX
   - Correct Answer: Select/mark the correct answer

2. **Look for the message: "{{ domaines.length }} domaine(s) disponible(s)"**
   - This should show **10 domaine(s) disponible(s)**
   - If it shows 0, domaines array is empty - this is the problem!

3. **Click "Ajouter la Question" button**

### Step 4: Check Console Logs

#### EXPECTED LOGS (if working correctly):
Look for logs starting with:
```
🔍 STEP 1 - Form validation started
  domaineId: 1  (for example)
  domaineTexte: 
  domaine: 
  Available domains: [Array(10)]
  Matched domain for ID 1: {id: 1, nom: 'INFORMATIQUE'}

✅ STEP 2 - Form validation passed

🏗️ buildQuestionDto() - Building payload
   Input - domaineId: 1
   Input - domaineTexte: 
   Input - domaine: 
   Available domaines array: [Array(10)]
   Searching for domain with ID: 1
   Domaines array length: 10
     Comparing: d.id= 1 vs 1 - match: true
✅ Domaine trouvé dans la liste: INFORMATIQUE ID: 1

📤 Payload finalisé: {…}
   Domaine field in payload: INFORMATIQUE
```

#### PROBLEM INDICATORS:
1. **"Available domains: []"** = domaines array is empty
   - Solution: Check if `/api/domaines` endpoint is working
   - Check network tab in DevTools

2. **"Domaine avec ID X non trouvé dans la liste"** = ID mismatch
   - Solution: Domain ID in select doesn't match domaines array

3. **"domaineId: null"** = No domain selected
   - Solution: User must click and select a domain from dropdown

### Step 5: Share Diagnostic Information

If you see errors, please provide:

1. **Console logs** (Copy from console and paste)
   - Select all console output (Ctrl+A while in console)
   - Copy (Ctrl+C)
   - Paste in message

2. **Network response** (Check if API call succeeds):
   - Go to **Network** tab in DevTools
   - Look for requests to `/api/domaines`
   - Check if response shows 10 domains
   - Right-click response → Copy as cURL

3. **Form state screenshot**:
   - Take screenshot showing the form with:
     - Domain field clearly showing selection
     - Developer console visible with logs

## Quick Fixes to Try

### If no domains are showing:
```javascript
// Run this in console to check:
console.log('Domaines array:', this); // Check component state
```

### If domain is selecting but not being sent:
1. Hard refresh: **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac)
2. Clear browser cache: Settings → Clear browsing data → All time

### If still failing:
1. Check backend logs for exact error message
2. Verify DomaineType enum has 10 values: INFORMATIQUE, BUSINESS, SANTÉ, INGÉNIERIE, ÉDUCATION, DESIGN, COMMUNICATION, INDUSTRIE, COMMERCE, AUTRE
3. Restart backend service

## Technical Details

- **Component File:** `src/app/recruiter-dashboard/rd-add-questions/rd-add-questions.ts`
- **Template File:** `src/app/recruiter-dashboard/rd-add-questions/rd-add-questions.html`
- **API Service:** `src/app/api.service.ts` - method `createQuestion()`
- **Backend Endpoint:** `POST /api/questions/entretien/{entretienId}`

## Files Recently Modified
- Removed old `createQuestion()` method (duplicate code)
- Added comprehensive logging to track domain through form submission
- Added 'AUTRE' (10th domain) to fallback list
- Verified project builds successfully with `ng build --configuration development`
