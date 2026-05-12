# 403 Forbidden Authentication Debugging Guide

## Issue
POST request to `/api/questions/entretien/1` returns 403 Forbidden

## Root Cause Analysis
The 403 error means:
1. Request reached the backend server
2. Backend rejected the request due to missing/invalid authorization

## Possible Causes
1. **Token not stored** - User not logged in
2. **Token not sent** - AuthInterceptor not working
3. **Token missing RECRUTEUR role** - Wrong user type logged in
4. **Backend JWT parsing issue** - Token format not recognized

## Step-by-Step Debugging

### STEP 1: Verify Token in Browser Storage
1. Open **Chrome DevTools** (F12)
2. Go to **Application** > **Local Storage**
3. Find `localhost:4200` entry
4. Look for key: `token`
5. **EXPECTED:** Should see a JWT token (format: `eyJhbGc...`)
6. **IF MISSING:** User is NOT logged in

### STEP 2: Check Network Request Headers
1. In Chrome DevTools, go to **Network** tab
2. Filter for requests to `questions/entretien/1`
3. Click the POST request
4. Go to **Request Headers** tab
5. Look for `Authorization` header
6. **EXPECTED:** `Authorization: Bearer eyJhbGc...`
7. **IF MISSING:** AuthInterceptor not adding token

### STEP 3: Login Process Verification

If token is missing, user needs to login:
1. Go to navbar login modal
2. Select role: **"Recruteur"**
3. Enter test credentials:
   - Email: `recruteur@test.com`
   - Password: `Test@1234`
4. Click "Se connecter"
5. **SUCCESS:** Alert says "Connexion réussie !"
6. **FAILURE:** Alert shows error

### STEP 4: Browser Console Check
1. Open **Console** tab (F12)
2. Look for login/auth related logs:
   - `"Tentative de connexion"` - login attempt
   - `"Login successful"` - token received
   - `"ID Recruteur stocké"` - role verified
3. **ERRORS TO LOOK FOR:**
   - `"Login failed"` - backend rejected credentials
   - Network error - backend unreachable
   - Token decode error - malformed response

### STEP 5: Verify Authentication Header
Run this in **Console** to check token:
```javascript
// Check if token exists
const token = localStorage.getItem('token');
console.log('Token exists:', !!token);
console.log('Token value:', token);

// Try to decode (if jwt-decode available)
if (token && window.jwtDecode) {
  const decoded = window.jwtDecode(token);
  console.log('Decoded token:', decoded);
  console.log('Has RECRUTEUR role:', JSON.stringify(decoded).includes('RECRUTEUR'));
}
```

## Common Issues & Solutions

### Issue 1: Token Missing from localStorage
**Solution:**
- Login with recruteur credentials
- Verify alert shows "Connexion réussie !"
- Check console for: `"[object Object]"` or valid JWT

### Issue 2: Token Present but Authorization Header Missing
**Solution:**
- Verify AuthInterceptor is registered (check app.module.ts)
- Check if request URL includes "`/api/auth/`" (auth endpoints don't get token)
- Restart Angular dev server: `ng serve`

### Issue 3: Token Present but Doesn't Include RECRUTEUR Role
**Solution:**
- Logout and login again with **RECRUTEUR** role selected
- Check Console log: `"Final role used for redirect: RECRUTEUR"`
- Verify backend login endpoint returns role in JWT

### Issue 4: Backend Returns 403 Despite Valid Token
**Solution:**
- Check backend SecurityConfig.java has this line:
  ```java
  .requestMatchers(HttpMethod.POST, "/api/questions/entretien/**").hasAuthority("ROLE_RECRUTEUR")
  ```
- Verify backend Spring Security filter chain includes JwtFilter
- Check backend logs for: `"User not authorized"` or `"Invalid token"`

## Verification Checklist
- [ ] Token visible in localStorage
- [ ] Authorization header present in Network requests
- [ ] Token decoded successfully in console
- [ ] Token contains `ROLE_RECRUTEUR` 
- [ ] Backend returns 200/201 for POST request
- [ ] Question created in database

## Next Steps If Still Getting 403
1. Check backend logs for detailed error message
2. Verify SecurityConfig.java was recompiled
3. Confirm Spring Boot application restarted
4. Check JWT secret key matches between login and question creation
5. Verify database permissions for questions table

## Backend Command to Check Logs
From `C:\Users\user\IdeaProjects\jobmatch` run:
```powershell
# View last 50 lines of logs
.\mvnw.cmd spring-boot:run -q 2>&1 | Select-String "ERROR|WARN|403" | tail -50
```
