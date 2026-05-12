# Emotion Detection in Video Interviews - Implementation Guide

## Overview
This implementation adds **real-time emotion detection** to video interviews, analyzing both **facial expressions** and **voice characteristics** (tone, stress, confidence).

---

## Backend Implementation (Spring Boot)

### 1. **New Entities**

#### `EmotionAnalysis.java`
- Main entity storing emotion analysis results
- Linked to `Entretien` (interview)
- Stores aggregated emotion scores (facial + voice)
- Engagement score calculated from emotions + confidence
- Status tracking: RUNNING → COMPLETED

**Key Fields:**
- `averageJoy`, `averageAnger`, `averageSadness`, `averageSurprise`, `averageFear`, `averageNeutral` (facial emotions 0-100)
- `averageStressLevel`, `averageConfidence` (voice analysis 0-100)
- `engagementScore` (combined metric 0-100)
- `dominantEmotion` (most expressed emotion)
- `overallAssessment` (generated text assessment)

#### `EmotionFrame.java`
- Stores individual frame-by-frame emotion data
- Timestamp for sync with video
- Detailed facial + voice metrics per frame
- Allows retrospective analysis and graphing

### 2. **Data Transfer Objects (DTOs)**

- `EmotionAnalysisDTO` - API response format
- `EmotionFrameDTO` - Frame data format
- `ProcessEmotionFrameRequest` - Frontend → Backend request format

### 3. **Repositories**

- `EmotionAnalysisRepository` - CRUD operations + custom queries
- `EmotionFrameRepository` - Frame data access

### 4. **Service Layer**

#### `EmotionAnalysisService`
Key methods:
- `startEmotionAnalysis(entretienId)` - Initialize analysis
- `processEmotionFrame(entretienId, request)` - Store frame data
- `updateEmotionAnalysisAggregates(analysisId)` - Calculate averages
- `completeEmotionAnalysis(entretienId)` - Finalize + generate assessment
- `getEmotionAnalysis(entretienId)` - Retrieve results
- `getEmotionFrames(entretienId)` - Get all frame data

**Features:**
- Real-time aggregation of emotion scores
- Dominant emotion detection
- Engagement score calculation: (Confidence × 0.4) + (Joy × 0.3) + (100 - Stress × 0.3)
- Automated assessment generation

### 5. **REST API Endpoints**

```
POST   /api/interviews/{entretienId}/emotion-analysis/start
       Start emotion analysis for an interview

POST   /api/interviews/{entretienId}/emotion-analysis/process-frame
       Submit emotion data for a single video frame
       Request body: ProcessEmotionFrameRequest

GET    /api/interviews/{entretienId}/emotion-analysis
       Get current analysis results

GET    /api/interviews/{entretienId}/emotion-analysis/frames
       Get all frame data (for graphing/review)

POST   /api/interviews/{entretienId}/emotion-analysis/complete
       Finalize analysis and generate assessment
```

### 6. **Database Migration**

Run `emotion_analysis_migration.sql` to create:
- `emotion_analysis` table
- `emotion_frames` table
- Proper indexing for performance

---

## Frontend Implementation (Angular)

### 1. **Services**

#### `EmotionAnalysisService`
- HTTP communication with backend
- Manages API requests/responses
- Observable-based reactive design

#### `FaceDetectionService`
- Loads TensorFlow.js + face-api.js libraries
- Initializes webcam stream
- Real-time facial emotion detection
- Emotion categories: joy, anger, sadness, surprise, fear, neutral
- Face detection confidence scoring

**Key Methods:**
- `initializeVideoStream()` - Setup webcam
- `startDetection(callback)` - Begin analysis loop
- `stopDetection()` - Cleanup
- `captureFrame()` - Screenshot for storage

#### `AudioAnalysisService`
- Web Audio API integration
- Real-time voice analysis
- Metrics calculated:
  - **Pitch** (Hz): Fundamental frequency
  - **Volume Level** (dB): Sound intensity
  - **Stress Level** (0-100): Based on pitch variation + volume inconsistency
  - **Confidence** (0-100): Inverse of stress + volume consistency
  - **Speaking Rate** (WPM): Estimated from volume peaks
  - **Silence Detection**: Pauses/hesitations

**Algorithm:**
- Stress = (Pitch Variance × 0.6) + (Volume Variance × 0.4)
- Confidence = 100 - Stress (with volume consistency boost)
- Speaking Rate = Volume peaks × 15 (rough approximation)

### 2. **Emotion Detector Component**

#### `EmotionDetectorComponent`
Real-time UI display of emotion analysis:

**Features:**
- Hidden video/canvas elements for ML inference
- Real-time emotion bar charts (6 emotions)
- Voice analysis metrics (confidence, stress, pitch, speaking rate)
- Engagement score calculation + circular progress display
- Face detection status indicator
- Frame counter (number of processed frames)

**Engagement Score Calculation:**
```
Emotional Engagement = (Joy×0.3 + (100-Sadness)×0.2 + Surprise×0.1) / 0.6
Voice Engagement = (Confidence×0.4 + (100-Stress)×0.3 + (SpeakingRate/3)×0.3)
Final Score = (Emotional×0.5 + Voice×0.5)
```

**Styling:**
- Color-coded emotion bars (green=joy, red=anger, blue=sadness, orange=surprise, purple=fear, gray=neutral)
- Circular engagement gauge
- Real-time metrics dashboard
- Responsive grid layout

### 3. **Integration with Video Interview**

Updated `VideoInterviewRoomPageComponent`:
- Imports `EmotionDetectorComponent`
- Passes `entretienId` to emotion detector
- Cleanup on component destroy (calls `completeAnalysis()`)
- Added panel below Jitsi meeting for live emotion display

---

## Data Flow

```
User starts interview
    ↓
VideoInterviewRoomPageComponent initialized
    ↓
EmotionDetectorComponent mounted
    ↓
POST /api/interviews/{id}/emotion-analysis/start
    ↓
FaceDetectionService.startDetection()
AudioAnalysisService.startAnalysis()
    ↓
[Continuous loop every frame]
  1. Capture video frame
  2. Detect facial emotions (TensorFlow.js)
  3. Analyze audio (Web Audio API)
  4. Calculate metrics
  5. Update UI display
  6. Every 5 frames: POST /api/interviews/{id}/emotion-analysis/process-frame
    ↓
User leaves interview
    ↓
POST /api/interviews/{id}/emotion-analysis/complete
    ↓
Backend generates assessment
Results saved + displayed to recruiter
```

---

## Required Libraries

### Backend
- Already included in Spring Boot dependencies
- No additional packages needed

### Frontend
External libraries loaded dynamically:

```javascript
TensorFlow.js: https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.7.0
Face-API.js: https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js
MediaPipe: (optional, for advanced hand/pose detection)
```

**Browser Requirements:**
- WebRTC support (navigator.mediaDevices.getUserMedia)
- Web Audio API support
- Modern JavaScript engine (ES6+)

---

## Configuration

### In Frontend Environment
```typescript
// environment.ts
export const environment = {
  apiUrl: 'http://localhost:8080/api'
};
```

### In Backend Application
```properties
# application.properties
spring.datasource.url=jdbc:mysql://localhost:3306/jobmatch
spring.datasource.username=root
spring.datasource.password=password
```

---

## Usage Example

### For Recruiters
1. Create a video interview
2. Send meeting link to candidate
3. Candidate joins interview
4. Emotion detector automatically starts
5. Real-time emotions displayed in panel below video
6. Interview ends → analysis auto-completes
7. View detailed report: Emotions, voice analysis, engagement score

### For Candidates
1. Join video interview room
2. Detector asks for microphone/camera permissions (first time)
3. See real-time emotion feedback (optional)
4. Interview proceeds normally
5. Emotions analyzed passively in background

---

## API Response Example

### GET /api/interviews/{id}/emotion-analysis
```json
{
  "success": true,
  "data": {
    "id": 1,
    "entretienId": 42,
    "status": "COMPLETED",
    "totalFrames": 1200,
    "processedFrames": 1200,
    "averageJoy": 65.5,
    "averageAnger": 8.2,
    "averageSadness": 12.1,
    "averageSurprise": 25.3,
    "averageFear": 3.1,
    "averageNeutral": 42.0,
    "averageStressLevel": 35.2,
    "averageConfidence": 72.8,
    "speakingRate": 145.5,
    "dominantEmotion": "joy",
    "engagementScore": 73.2,
    "overallAssessment": "Candidat généralement positif et souriant...",
    "completedAt": "2026-04-20T14:30:00"
  }
}
```

---

## Performance Notes

- **Frame processing**: Every 5 frames sent to backend (reduce network traffic)
- **Video canvas**: 640×480 resolution (balance accuracy vs performance)
- **FFT size**: 4096 samples (audio analysis precision)
- **Update frequency**: 30 FPS for UI (requestAnimationFrame)

---

## Security & Privacy Considerations

⚠️ **Important:**
1. **User Consent**: Always request permission before accessing webcam/microphone
2. **Data Storage**: Consider GDPR/privacy laws before storing video frames
3. **Authentication**: Only authenticated recruiters can view analyses
4. **Encryption**: Use HTTPS for all emotion data transmission
5. **Retention**: Implement data deletion policy for stored emotions

---

## Troubleshooting

### Issue: "Face detection libraries failed to load"
- **Cause**: CDN unavailable or network issue
- **Solution**: Use local CDN mirrors or self-host libraries

### Issue: "Microphone/camera access denied"
- **Cause**: Browser permissions or hardware unavailable
- **Solution**: Check browser settings, test device permissions

### Issue: "Low emotion detection accuracy"
- **Cause**: Lighting, face angle, or library limitations
- **Solution**: Improve lighting, adjust face angle, use better ML models

### Issue: "Backend not receiving frames"
- **Cause**: API endpoint misconfigured
- **Solution**: Verify CORS settings, check API URL in environment

---

## Future Enhancements

1. **Advanced ML Models**: Use DeepFace, Affectiva, or custom models
2. **Multi-face Detection**: Support interviews with multiple participants
3. **Eye Gaze Tracking**: Measure attention/focus
4. **Sentiment Analysis**: Analyze speech transcription for content sentiment
5. **Real-time Alerts**: Notify recruiters of concerning emotion patterns
6. **Comparison Analytics**: Compare candidate emotions across multiple interviews
7. **Bias Detection**: Flag potential recruiter bias based on emotion data
8. **Export Reports**: PDF reports with charts and analysis

---

## References

- TensorFlow.js: https://www.tensorflow.org/js
- Face-API.js: https://github.com/vladmandic/face-api
- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- WebRTC getUserMedia: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia

---

**Version**: 1.0  
**Last Updated**: April 20, 2026  
**Status**: Production Ready
