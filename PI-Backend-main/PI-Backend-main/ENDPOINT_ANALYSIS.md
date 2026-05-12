# Backend Endpoint Analysis Report

## Project Location
`C:\Users\user\IdeaProjects\jobmatch`

---

## 1. Inscription Endpoint - GET /api/inscriptions/candidat/{id}

### Endpoint Location
**File:** [src/main/java/t/esprit/arctic/jobmatch/controller/InscriptionFormationController.java](InscriptionFormationController.java)

### Controller Implementation
```java
@RestController
@RequestMapping("/api/inscriptions")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class InscriptionFormationController {

    private final InscriptionFormationService inscriptionService;

    // ✅ Target endpoint
    @GetMapping("/candidat/{candidatId}")
    public ResponseEntity<List<InscriptionFormation>> getByCandidat(@PathVariable Long candidatId) {
        return ResponseEntity.ok(inscriptionService.getByCandidat(candidatId));
    }
}
```

### Service Implementation
**File:** `src/main/java/t/esprit/arctic/jobmatch/service/InscriptionFormationService.java`

```java
public List<InscriptionFormation> getByCandidat(Long candidatId) {
    return inscriptionRepository.findByCandidatId(candidatId);
}
```

### Repository Query
**File:** `src/main/java/t/esprit/arctic/jobmatch/repository/InscriptionFormationRepository.java`

```java
public interface InscriptionFormationRepository extends JpaRepository<InscriptionFormation, Long> {
    List<InscriptionFormation> findByCandidatId(Long candidatId);
    // ... other methods
}
```

### Security Configuration
**File:** `src/main/java/t/esprit/arctic/jobmatch/config/SecurityConfig.java`

```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/auth/**").permitAll()
    .requestMatchers(HttpMethod.POST, "/api/feedbacks").hasAuthority("ROLE_CANDIDAT")
    .requestMatchers(HttpMethod.GET, "/api/feedbacks/**").hasAuthority("ROLE_ORGANISATEUR")
    // ⚠️ /api/inscriptions/** NOT explicitly configured
    // Falls under: .anyRequest().authenticated()
)
```

### Error Analysis - 500 Error for candidatId=3

**Root Causes:**

1. **No explicit error handling:** The service method directly throws `RuntimeException` wrapped exceptions
   - When `candidatId` doesn't exist → Returns empty list (no error)
   - When null/invalid data in relationships → Potential JSON serialization error

2. **Lazy loading issues:** InscriptionFormation has relationships:
   ```java
   @ManyToOne
   @JoinColumn(name = "formation_id", nullable = false)
   @JsonIgnoreProperties({"inscriptions", "competences"})
   private Formation formation;
   
   @ManyToOne
   @JoinColumn(name = "candidat_id", nullable = false)
   @JsonIgnoreProperties({"motDePasse", "inscriptions", "candidatures", "competences", "cv", "localisation"})
   private Candidat candidat;
   ```
   - Missing related Formation or Candidat records → 500 error
   - Circular reference issues despite @JsonIgnoreProperties

3. **Exception Handling:**
   ```java
   @ExceptionHandler(Exception.class)
   public ResponseEntity<ErrorResponse> handleGeneralException(Exception ex) {
       ex.printStackTrace();
       ErrorResponse response = new ErrorResponse(
           HttpStatus.INTERNAL_SERVER_ERROR.value(),
           "Erreur serveur: " + ex.getMessage()
       );
       return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
   }
   ```

### Security Status
✅ **Authentication Required:** YES (falls under `.anyRequest().authenticated()`)
- Requires valid JWT token in Authorization header
- Users must have at least one authority

⚠️ **No Role Restriction:** Any authenticated user can access inscriptions for any candidatId
- **Recommendation:** Add role-based restrictions:
  ```java
  .requestMatchers("/api/inscriptions/candidat/**").access("hasAnyAuthority('ROLE_CANDIDAT', 'ROLE_ADMIN')")
  ```

---

## 2. Feedback Endpoint - GET /api/feedbacks/formation/{id}

### Endpoint Location
**File:** `src/main/java/t/esprit/arctic/jobmatch/controller/FeedbackController.java`

### Controller Implementation
```java
@RestController
@RequestMapping("/api/feedbacks")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class FeedbackController {

    private final FeedbackService feedbackService;

    // ✅ Target endpoint
    @GetMapping("/formation/{formationId}")
    public ResponseEntity<List<Feedback>> getByFormation(@PathVariable Long formationId) {
        return ResponseEntity.ok(feedbackService.getByFormation(formationId));
    }
}
```

### Service Implementation
**File:** `src/main/java/t/esprit/arctic/jobmatch/service/FeedbackService.java`

```java
public List<Feedback> getByFormation(Long formationId) {
    return feedbackRepository.findByFormationId(formationId);
}
```

### Repository Query
**File:** `src/main/java/t/esprit/arctic/jobmatch/repository/FeedbackRepository.java`

```java
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    // ✅ Target query
    List<Feedback> findByFormationId(Long formationId);
    // ... other methods
}
```

### Security Configuration - **🔴 SOURCE OF 403 ERROR**

```java
.authorizeHttpRequests(auth -> auth
    // ...
    .requestMatchers(HttpMethod.GET, "/api/feedbacks/**").hasAuthority("ROLE_ORGANISATEUR")
    // ⚠️ ⚠️ ⚠️ RESTRICTS ALL GET /api/feedbacks/** to ROLE_ORGANISATEUR ONLY
)
```

### Error Analysis - 403 Forbidden Error

**Root Cause: Authorization Restriction**

The security configuration explicitly requires `ROLE_ORGANISATEUR` authority for **ALL** GET requests to `/api/feedbacks/**`:

```java
.requestMatchers(HttpMethod.GET, "/api/feedbacks/**").hasAuthority("ROLE_ORGANISATEUR")
```

**This means:**
- ❌ ROLE_CANDIDAT cannot read feedbacks
- ❌ ROLE_ADMIN cannot read feedbacks
- ❌ ROLE_RECRUTEUR cannot read feedbacks
- ✅ Only ROLE_ORGANISATEUR can read feedbacks

**Feedback Entity Relationships:**
```java
@ManyToOne
@JoinColumn(name = "formation_id", nullable = false)
@JsonIgnoreProperties({"inscriptions", "competences"})
private Formation formation;

@ManyToOne
@JoinColumn(name = "candidat_id", nullable = false)
@JsonIgnoreProperties({"motDePasse", "inscriptions", "candidatures", "competences"})
private Candidat candidat;

@ManyToOne
@JoinColumn(name = "participation_id")
private Participation participation;
```

### Security Status
⚠️ **Overly Restrictive:** Only `ROLE_ORGANISATEUR` can access
- **Recommendation:** Define more granular permissions based on use case:
  ```java
  // Option 1: Allow ORGANISATEUR and ADMIN
  .requestMatchers(HttpMethod.GET, "/api/feedbacks/formation/**")
    .hasAnyAuthority("ROLE_ORGANISATEUR", "ROLE_ADMIN")
  
  // Option 2: Separate permissions by endpoint
  .requestMatchers(HttpMethod.GET, "/api/feedbacks").hasAuthority("ROLE_ORGANISATEUR")
  .requestMatchers(HttpMethod.GET, "/api/feedbacks/formation/**").permitAll()
  ```

---

## 3. Authentication & JWT Configuration

### JWT Filter Implementation
**File:** `src/main/java/t/esprit/arctic/jobmatch/security/JwtFilter.java`

```java
@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserDetailsServiceImpl userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                String email = jwtService.extractEmail(token);
                if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    var userDetails = userDetailsService.loadUserByUsername(email);
                    var auth = new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            } catch (io.jsonwebtoken.ExpiredJwtException e) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write("Token expiré");
                return;
            } catch (Exception e) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write("Token invalide");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
```

### Error Handling
**File:** `src/main/java/t/esprit/arctic/jobmatch/exception/GlobalExceptionHandler.java`

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentialsException(BadCredentialsException ex) {
        // Returns 401 UNAUTHORIZED
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(ResourceNotFoundException ex) {
        // Returns 404 NOT_FOUND
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneralException(Exception ex) {
        // Returns 500 INTERNAL_SERVER_ERROR
        ErrorResponse response = new ErrorResponse(
            HttpStatus.INTERNAL_SERVER_ERROR.value(),
            "Erreur serveur: " + ex.getMessage()
        );
    }
}
```

---

## 4. Recommended Fixes

### For Inscription Endpoint (500 Error)

```java
// InscriptionFormationService.java
public List<InscriptionFormation> getByCandidat(Long candidatId) {
    if (candidatId == null || candidatId <= 0) {
        throw new IllegalArgumentException("candidatId doit être valide");
    }
    return inscriptionRepository.findByCandidatId(candidatId);
}

// SecurityConfig.java - Add role restriction
.requestMatchers(HttpMethod.GET, "/api/inscriptions/candidat/**")
    .access("hasAnyAuthority('ROLE_CANDIDAT', 'ROLE_ADMIN')")
```

### For Feedback Endpoint (403 Error)

**IMMEDIATE FIX:** Update SecurityConfig.java:

```java
// BEFORE (too restrictive):
.requestMatchers(HttpMethod.GET, "/api/feedbacks/**").hasAuthority("ROLE_ORGANISATEUR")

// AFTER (more permissive):
.requestMatchers(HttpMethod.GET, "/api/feedbacks/formation/**")
    .hasAnyAuthority("ROLE_ORGANISATEUR", "ROLE_ADMIN", "ROLE_CANDIDAT")
// Or use specific checks
.requestMatchers(HttpMethod.GET, "/api/feedbacks").hasAuthority("ROLE_ORGANISATEUR")
.requestMatchers(HttpMethod.GET, "/api/feedbacks/formation/**").permitAll()
```

---

## 5. Database Schema References

**Application Configuration:**
- **File:** `src/main/resources/application.properties`
- Database: MySQL at `localhost:3306/jobmatch_db`
- JPA: `spring.jpa.hibernate.ddl-auto=update`
- Logging: INFO level for web requests

---

## Summary Table

| Endpoint | Method | Path | Status | Issue | Root Cause |
|----------|--------|------|--------|-------|------------|
| Inscription | GET | `/api/inscriptions/candidat/{id}` | 500 | Missing error handling, lazy loading issues | Exception in JSON serialization or missing relationships |
| Feedback | GET | `/api/feedbacks/formation/{id}` | 403 | Authorization denied | SecurityConfig restricts to ROLE_ORGANISATEUR only |

