// AUTHENTICATION DEBUGGING UTILITY
// Copy and paste this entire script into the browser console (F12 > Console tab)
// This will help diagnose why 403 Forbidden errors are occurring

console.log('=== JOVE AUTHENTICATION DEBUG UTILITY ===\n');

// 1. Check if token exists
console.log('1️⃣ CHECKING TOKEN IN LOCALSTORAGE');
const token = localStorage.getItem('token');
if (token) {
  console.log('✅ Token found');
  console.log('   Length:', token.length);
  console.log('   First 50 chars:', token.substring(0, 50) + '...');
  console.log('   Starts with "eyJ":', token.startsWith('eyJ'));
} else {
  console.log('❌ NO TOKEN FOUND - User is NOT logged in');
  console.log('   ACTION NEEDED: Login as RECRUTEUR');
}

// 2. Try to decode token
console.log('\n2️⃣ DECODING JWT TOKEN');
try {
  const decoded = window.jwtDecode ? window.jwtDecode(token) : null;
  if (decoded) {
    console.log('✅ Token decoded successfully');
    console.log('   Issued at:', new Date(decoded.iat * 1000));
    console.log('   Expires at:', new Date(decoded.exp * 1000));
    console.log('   Email:', decoded.email || decoded.sub);
    console.log('   Authorities:', decoded.authorities || decoded.roles || 'None found');
    console.log('   Has RECRUTEUR:', JSON.stringify(decoded).includes('RECRUTEUR'));
    console.log('\n   Full decoded token:', decoded);
  } else {
    console.log('⚠️ jwt-decode not available but token exists');
  }
} catch (e) {
  console.log('❌ Failed to decode token:', e.message);
}

// 3. Check auth interceptor
console.log('\n3️⃣ CHECKING HTTP INTERCEPTOR');
console.log('ℹ️ AuthInterceptor should add Authorization header to all API requests');
console.log('ℹ️ Check Network tab > find POST request to /api/questions/entretien/1');
console.log('ℹ️ Look for "Authorization: Bearer ..." header');

// 4. Test a simple API call
console.log('\n4️⃣ TESTING API CALL WITH CURRENT TOKEN');
console.log(`Running: fetch("http://localhost:8080/api/domaines", { headers: { "Authorization": "Bearer ${token ? token.substring(0, 20) + '...' : 'NO_TOKEN'}" }})`);

if (token) {
  fetch('http://localhost:8080/api/domaines', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
    .then(response => {
      console.log('   Response status:', response.status);
      if (response.ok) {
        console.log('   ✅ Bearer token accepted by backend');
        return response.json();
      } else if (response.status === 403) {
        console.log('   ❌ 403 Forbidden - Token rejected or missing required role');
      } else if (response.status === 401) {
        console.log('   ❌ 401 Unauthorized - Token invalid or expired');
      }
      return response.json().then(data => {
        console.log('   Error response:', data);
        throw new Error(`HTTP ${response.status}`);
      });
    })
    .then(data => console.log('   ✅ Response data:', data))
    .catch(error => console.log('   Error:', error.message));
} else {
  console.log('❌ Cannot test - no token found');
}

// 5. Summary
console.log('\n5️⃣ DIAGNOSTIC SUMMARY');
console.log('================================');
if (token) {
  console.log('✅ Token exists in localStorage');
  console.log('✅ AuthInterceptor should add it to requests');
  console.log('⚠️ If still getting 403, then:');
  console.log('   - Token may not contain ROLE_RECRUTEUR');
  console.log('   - Backend may be rejecting the role');
  console.log('   - Backend SecurityConfig may not be recompiled');
} else {
  console.log('❌ No token found');
  console.log('🚨 USER MUST LOGIN');
  console.log('   1. Go to navbar');
  console.log('   2. Click "Se connecter"');
  console.log('   3. Select "Recruteur" in role dropdown');
  console.log('   4. Enter credentials and login');
}

console.log('\n=== END DEBUG ===\n');

// Export for manual testing
window.__authDebug = {
  token: token,
  hasRecruteurRole: token ? JSON.stringify(window.jwtDecode(token)).includes('RECRUTEUR') : false,
  testPostRequest: function() {
    if (!token) {
      console.log('Cannot test - no token');
      return;
    }
    console.log('Testing POST to /api/questions/entretien/1...');
    const testData = {
      contenu: 'Test Question',
      type: 'QCM',
      niveau: 'MOYEN',
      domaineId: 1,
      choix: [
        { texte: 'Option A', correcte: true, ordre: 1 },
        { texte: 'Option B', correcte: false, ordre: 2 }
      ]
    };
    fetch('http://localhost:8080/api/questions/entretien/1', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    })
      .then(r => {
        console.log('Response:', r.status, r.statusText);
        return r.json();
      })
      .then(data => console.log('Response data:', data))
      .catch(e => console.log('Error:', e));
  }
};
console.log('Available functions: window.__authDebug.testPostRequest()');
