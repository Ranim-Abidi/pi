# Emotion Detection - Installation & Deployment Guide

## Prerequisites
- **Java 17+** (Spring Boot 3.2.5)
- **Node.js 18+** (Angular)
- **MySQL 8.0+**
- **Maven 3.8+**
- Modern web browser (Chrome, Firefox, Safari, Edge)

---

## Step 1: Database Setup

### 1.1 Create Database
```bash
mysql -u root -p
CREATE DATABASE jobmatch;
USE jobmatch;
```

### 1.2 Run Migration
```bash
mysql -u root -p jobmatch < src/main/resources/emotion_analysis_migration.sql
```

### 1.3 Verify Tables Created
```sql
SHOW TABLES;
-- Should show: emotion_analysis, emotion_frames
```

---

## Step 2: Backend Configuration

### 2.1 Update Application Properties
Edit `src/main/resources/application.properties`:
```properties
# Database
spring.datasource.url=jdbc:mysql://localhost:3306/jobmatch
spring.datasource.username=root
spring.datasource.password=YOUR_PASSWORD

# JPA
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false

# CORS (for frontend communication)
server.port=8080
```

### 2.2 Build Backend
```bash
cd C:\Users\user\IdeaProjects\jobmatch
mvn clean package
```

Expected output:
```
[INFO] BUILD SUCCESS
[INFO] Total time: XX.XXXs
```

### 2.3 Run Backend
```bash
java -jar target/jobmatch-0.0.1-SNAPSHOT.jar
```

Expected output:
```
Started JobmatchApplication in X.XXXs
Tomcat started on port 8080
```

---

## Step 3: Frontend Configuration

### 3.1 Verify Services Exist
Check these files exist:
- `src/app/services/emotion-analysis.service.ts`
- `src/app/services/face-detection.service.ts`
- `src/app/services/audio-analysis.service.ts`
- `src/app/shared/emotion-detector/emotion-detector.component.ts`

### 3.2 Update Environment Settings
Edit `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api'  // Match backend port
};
```

### 3.3 Build Frontend
```bash
cd "c:\Users\user\Desktop\projet integré\themeforest-OmXxesDy-jove-angular-job-board-template\jove"
npm install
ng build
```

### 3.4 Run Frontend Development Server
```bash
ng serve --open
# Should open http://localhost:4200
```

Expected output:
```
✔ Compiled successfully.
Application bundle generated successfully in X.XXXs.
```

---

## Step 4: Test Emotion Detection

### 4.1 Create Interview via Recruiter Dashboard
1. Login as Recruiter
2. Navigate to "Manage Job Offers"
3. Create new interview with:
   - Mode: **VIDEO**
   - Jitsi Meeting Link: `https://meet.jit.si/jobmatch-interview-123`

### 4.2 Test as Candidate
1. Login as Candidate
2. Navigate to "My Interviews"
3. Click on interview → Join video room
4. **Watch emotion detector panel appear below video**
5. Allow camera/microphone permissions when prompted
6. Speak and move face → emotions should update in real-time

### 4.3 Monitor Backend Console
You should see logs:
```
[INFO] EmotionAnalysisService - Starting emotion analysis for interview: 123
[INFO] EmotionAnalysisController - Processing frame 1 of interview 123
[INFO] EmotionAnalysisService - Updating emotion aggregates...
[INFO] EmotionAnalysisController - Emotion analysis completed
```

### 4.4 Verify Data in Database
```sql
USE jobmatch;
SELECT * FROM emotion_analysis;
SELECT * FROM emotion_frames WHERE emotion_analysis_id = 1;
```

---

## Step 5: View Results

### 5.1 Via API (Manual Testing)
```bash
# Start analysis
curl -X POST http://localhost:8080/api/interviews/1/emotion-analysis/start

# Get results
curl http://localhost:8080/api/interviews/1/emotion-analysis

# Get frame data
curl http://localhost:8080/api/interviews/1/emotion-analysis/frames
```

### 5.2 Via Recruiter Dashboard (Future)
Recruiters can view emotion analysis in interview details page (to be implemented)

---

## Troubleshooting

### Issue: "Cannot GET /api/interviews/1/emotion-analysis"
**Cause**: Backend not running or CORS issue  
**Solution**:
```bash
# Restart backend
mvn spring-boot:run

# Or ensure CORS config exists in backend
```

### Issue: "Face detection libraries failed to load"
**Cause**: CDN unreachable  
**Solution**:
1. Check internet connection
2. Check firewall blocking CDNs
3. Use alternative CDN in `face-detection.service.ts`:
   ```typescript
   // Replace CDN URL
   'https://unpkg.com/@tensorflow/tfjs@4.7.0'
   'https://unpkg.com/face-api.js@0.22.2/dist/face-api.min.js'
   ```

### Issue: "Permission denied accessing camera"
**Cause**: Browser permissions or device not available  
**Solution**:
1. Check browser permissions (Chrome Settings → Privacy)
2. Test camera works: `about:blank` → allow camera
3. Verify device connected: DevTools → check navigator.mediaDevices

### Issue: "No frames being sent to backend"
**Cause**: Face not detected or network error  
**Solution**:
1. Ensure good lighting
2. Position face in center of video
3. Check browser console for errors
4. Verify API URL in environment.ts

### Issue: "High CPU usage"
**Cause**: Face detection running continuously  
**Solution**:
1. Reduce frame rate in component (increase sampling interval)
2. Reduce canvas resolution (640×480 → 320×240)
3. Use Web Workers for detection (advanced)

---

## Performance Optimization

### For Production

#### Frontend
```typescript
// In emotion-detector.component.ts
// Reduce frame sending frequency (every Nth frame)
if (this.frameCounter % 10 === 0) {  // Send every 10 frames instead of 5
  this.sendFrameToBackend(result);
}

// Reduce canvas resolution
this.canvas.width = 320;   // Instead of 640
this.canvas.height = 240;  // Instead of 480
```

#### Backend
```properties
# In application.properties
spring.jpa.properties.hibernate.jdbc.batch_size=20
spring.jpa.properties.hibernate.order_inserts=true
spring.jpa.properties.hibernate.order_updates=true

# Connection pooling
spring.datasource.hikari.maximum-pool-size=20
```

---

## Production Checklist

- [ ] Use HTTPS for all connections
- [ ] Configure proper CORS origins
- [ ] Set up database backups
- [ ] Enable database encryption
- [ ] Configure session timeouts
- [ ] Implement rate limiting on API
- [ ] Add request logging/monitoring
- [ ] Enable GZIP compression
- [ ] Implement data retention policies
- [ ] Add user audit logging
- [ ] Test with multiple browsers
- [ ] Performance test with many concurrent users
- [ ] Setup monitoring (metrics, logs, traces)
- [ ] Implement error tracking (Sentry, etc.)
- [ ] Create user documentation

---

## Monitoring & Logging

### Backend Logging
```properties
# In application.properties
logging.level.t.esprit.arctic.jobmatch=DEBUG
logging.level.org.springframework.web=INFO
logging.file.name=logs/jobmatch.log
```

### Frontend Debugging
```typescript
// In emotion-detector.component.ts
// Add debug logging
console.log('Face detected:', result.faceDetected);
console.log('Emotions:', result.emotions);
console.log('Frames processed:', this.framesProcessed);
```

### View Logs
```bash
# Backend logs
tail -f logs/jobmatch.log

# Browser console
F12 → Console tab
```

---

## Security Considerations

⚠️ **IMPORTANT**

1. **User Consent**
   - Always inform users that emotion analysis is running
   - Collect explicit consent before accessing camera/microphone
   - Allow users to opt-out

2. **Data Privacy**
   - Don't store video frames permanently
   - Implement data retention policies
   - Use HTTPS for all transmission
   - Encrypt sensitive data at rest

3. **Access Control**
   - Only recruiters can view analyses
   - Add role-based access control (RBAC)
   - Log who accesses emotion data

4. **Compliance**
   - Review GDPR requirements
   - Implement "right to be forgotten"
   - Create privacy policy
   - Document data processing

---

## Rollback Plan

If you need to disable emotion detection:

### Completely Disable
```typescript
// In video-interview-room-page.component.ts
emotionAnalysisEnabled = false;  // Change to false
```

### Keep Data but Disable Collection
```bash
# Don't run emotion-analysis-migration.sql
# EmotionAnalysisService will throw 404 errors (gracefully handled)
```

### Delete All Emotion Data
```sql
DELETE FROM emotion_frames;
DELETE FROM emotion_analysis;
```

---

## Support & Documentation

- **Implementation Guide**: `EMOTION_DETECTION_GUIDE.md`
- **API Documentation**: Check `EmotionAnalysisController.java` for detailed JavaDoc
- **Error Messages**: Check browser console (frontend) and server logs (backend)
- **Code Comments**: All services have inline documentation

---

## Version Info

- **Implementation Date**: April 20, 2026
- **Spring Boot**: 3.2.5
- **Angular**: 17+
- **Java**: 17
- **MySQL**: 8.0+
- **Node.js**: 18+

---

**For questions or issues, check EMOTION_DETECTION_GUIDE.md for troubleshooting section.**
