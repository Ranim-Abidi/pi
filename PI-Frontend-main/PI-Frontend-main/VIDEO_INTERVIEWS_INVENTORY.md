# Video Interview & AI Features Inventory

**Last Updated:** April 20, 2026  
**Workspace:** Jove Angular Job Board Template

---

## 📋 Executive Summary

The Jove application has an **established video interview infrastructure** built on Jitsi Meet integration. However, **emotion detection and facial analysis features are NOT currently implemented**. The AI system is focused on question generation, not video analysis.

---

## 🎥 Video Interview Components & Pages

### 1. **Video Interview Room Component** (Live Implementation)
**Location:** [src/app/pages/video-interview-room-page](src/app/pages/video-interview-room-page)

**Files:**
- [video-interview-room-page.component.ts](src/app/pages/video-interview-room-page/video-interview-room-page.component.ts) (200+ lines)
- [video-interview-room-page.component.html](src/app/pages/video-interview-room-page/video-interview-room-page.component.html)
- [video-interview-room-page.component.scss](src/app/pages/video-interview-room-page/video-interview-room-page.component.scss)

**Functionality:**
- Loads Jitsi Meet via external script (`JitsiMeetExternalAPI`)
- Extracts room name from meeting link (e.g., meet.jit.si URLs)
- Validates interview is in VIDEO mode
- Manages Jitsi container lifecycle (init, dispose)
- Error handling for missing links or invalid room names

**Key Properties:**
```typescript
entretienId: number
entretienTitle: string
meetingLink: string // Jitsi meeting URL
loading: boolean
errorMessage: string
jitsiApi: any // Jitsi external API instance
```

**Route:** `/entretiens/video/:id`

---

### 2. **Recruiter Interview Management** (Dashboard)
**Location:** [src/app/recruiter-dashboard/rd-interviews](src/app/recruiter-dashboard/rd-interviews)

**Files:**
- [rd-interviews.ts](src/app/recruiter-dashboard/rd-interviews/rd-interviews.ts) (~1000+ lines)
- [rd-interviews.html](src/app/recruiter-dashboard/rd-interviews/rd-interviews.html)
- [rd-interviews.scss](src/app/recruiter-dashboard/rd-interviews/rd-interviews.scss)

**Functionality:**
- Create new interviews with VIDEO or QUESTIONS mode
- Edit/update existing interviews
- Manage interview details (title, description, meeting link, etc.)
- Display interview results and scores
- Generate shareable links for candidates
- View interview status and completion state

**Interview Types Supported:**
- TECHNIQUE, RH, MANAGERIAL, FINAL, PRESELECTION, TEST

**Interview Modes:**
- QUESTIONS (text-based)
- VIDEO (Jitsi Meet based)

**Key Features:**
- Meeting link validation
- Interview scoring (score displayed as percentage)
- Candidate/Job offer linking
- Success threshold management (seuilReussite)
- Duration setting (dureeMinutes)

---

### 3. **Candidate Interview List Page**
**Location:** [src/app/pages/candidate-entretiens-page](src/app/pages/candidate-entretiens-page)

**Files:**
- [candidate-entretiens-page.component.ts](src/app/pages/candidate-entretiens-page/candidate-entretiens-page.component.ts)
- [candidate-entretiens-page.component.html](src/app/pages/candidate-entretiens-page/candidate-entretiens-page.component.html)
- [candidate-entretiens-page.component.scss](src/app/pages/candidate-entretiens-page/candidate-entretiens-page.component.scss)

**Functionality:**
- Display interviews scheduled for logged-in candidate
- Show interview details (title, type, date, mode)
- Reminders for upcoming interviews
- Access links to join video interviews
- Interview filtering and search

**Route:** `/candidate-entretiens`

---

### 4. **Admin Interview Management**
**Location:** [src/app/admin-dashboard/entretien-list](src/app/admin-dashboard/entretien-list)

**Files:**
- [entretien-list.component.ts](src/app/admin-dashboard/entretien-list/entretien-list.component.ts)
- [entretien-list.component.html](src/app/admin-dashboard/entretien-list/entretien-list.component.html)
- [entretien-list.component.scss](src/app/admin-dashboard/entretien-list/entretien-list.component.scss)

**Functionality:**
- View all interviews in the system
- Search interviews by title, recruiter, type, category
- Update interview status (ACCEPTE / REFUSE)
- Administrative oversight of interview process

---

## 🤖 AI & Question Generation System

### AI Question Generation (No Video Analysis)
**Location:** [src/app/api.service.ts](src/app/api.service.ts)

**Key Methods:**
- `generateAiQuestionSuggestions(entretienId: number, payload: any)`
- `getQuestionsByEntretien(entretienId: number)`

**AI Provider Configuration:**
```
Environment Variable: AI_PROVIDER
Options: "groq" (primary) | "huggingface" (fallback)
Default: groq if GROQ_API_KEY set, otherwise huggingface
```

**Providers:**
1. **Groq** (Preferred)
   - Model: `llama-3.3-70b-versatile`
   - Higher quality responses

2. **HuggingFace** (Fallback)
   - Model: HuggingFaceH4/zephyr-7b-beta
   - Used when Groq unavailable

**Python AI Backend:** [src/api.py](src/api.py)
- Question generation from domain/type/theme
- Groq API integration
- HuggingFace fallback support
- JSON output generation

---

## 🧠 AI Model & Data

### Local ML Model (Question Generation Only)
**Location:** [saved_model/](saved_model)

**Files:**
- `model.pt` - PyTorch transformer model
- `vocab.json` - Vocabulary for tokenization

### Model Architecture
**Location:** [src/model.py](src/model.py)

```python
QuestionGeneratorModel (PyTorch)
├── Input: Context tokens (domain, type, level, theme)
├── Encoder: Multi-head attention (8 heads, 4 layers)
├── Decoder: Multi-head attention (8 heads, 4 layers)
└── Output: JSON question + multiple choice options
```

**Details:**
- d_model: 256
- nhead: 8
- num_encoder_layers: 4
- num_decoder_layers: 4
- dim_feedforward: 512
- max_seq_length: 1024

### Dataset
**Location:** [src/app/Nesrineai/data/](src/app/Nesrineai/data)

**Files:**
- `questions.json` - Base seed dataset (~100+ questions)
- `questions_expanded.json` - Expanded dataset with variations

**Dataset Structure:**
```json
{
  "input": "domaine:INFORMATIQUE | categorie:TECHNIQUE | niveau:Senior | type:QCU | theme:React hooks",
  "output": "{\"contenu\":\"Quel hook...\",\"type\":\"QCU\",\"points\":5,...}"
}
```

### Tokenizer
**Location:** [src/dataset.py](src/dataset.py)

```python
QuestionTokenizer
├── Character-level encoding (100% custom, no LLM dependency)
├── Special tokens: <PAD>, <BOS>, <EOS>, <UNK>
├── Methods: build_vocab(), encode(), decode(), save(), load()
└── Max length: 512 tokens
```

---

## 📊 Interview Scoring System

### Score Enrichment Pipeline
**Location:** [src/app/recruiter-dashboard/rd-manage-jobs/rd-manage-jobs.component.ts](src/app/recruiter-dashboard/rd-manage-jobs/rd-manage-jobs.component.ts)

**Key Methods:**
- `enrichInterviewsWithScores(interviews: any[])` - Fetches scores for all interviews
- `extractInterviewScore(entretien: any)` - Extracts score from various formats
- `getBestInterviewScore(offreId, candidature, interviews, fallback)` - Gets best score for candidate
- `extractCandidatureInterviewScore(candidature)` - Fallback score extraction

**Score Sources (Priority Order):**
1. Direct `score` field
2. `resultat.score`
3. `resultat.scoreFinal`
4. `resultat.note`
5. `resultat.scoreGlobale`
6. Calculated: `(bonnesReponses / totalQuestions) * 100`
7. Extracted from decision text pattern
8. Fallback: null

**Score Range:** 0-100%

**Scoring Logic:**
```typescript
if (entretienScore >= 80) → "Choix final recommandé"
if (entretienScore >= 65) → "Très bon profil"
if (entretienScore >= 50) → "Profil à renforcer"
if (entretienScore < 50) → "Risque entretien"
```

---

## 📱 API Endpoints (Backend Integration)

### Interview Management Endpoints
```
GET  /api/entretiens
GET  /api/entretiens/:id
GET  /api/entretiens/candidat/:candidatId
GET  /api/entretiens/recruteur/:recruteurId
GET  /api/entretiens/offre/:offreId
POST /api/entretiens
PUT  /api/entretiens/:id
PATCH /api/entretiens/:id/statut
```

### Question Management
```
GET  /api/questions/entretien/:entretienId
POST /api/questions/entretien/:entretienId
GET  /api/questions/suggestions
```

### Results & Scoring
```
GET  /api/entretiens/:entretienId/resultat
POST /api/entretiens/:entretienId/submit-responses
```

---

## 🎬 Video Interview Configuration

### Jitsi Meet Integration
- **External Library:** `JitsiMeetExternalAPI` (loaded dynamically)
- **Room Name Extraction:** From URLs like `https://meet.jit.si/roomName`
- **Container ID:** `#jitsiContainer`
- **Lifecycle Management:** Init on component mount, dispose on destroy

### Video Link Sources (Flexible):
```typescript
entretien.meetingLink
entretien.videoUrl
entretien.joinUrl
entretien.lienEntretien
```

---

## ❌ NOT Implemented: Emotion Detection / Video Analysis

### Missing Features (Based on Inventory):
1. ❌ Facial emotion recognition
2. ❌ Engagement analysis
3. ❌ Eye contact detection
4. ❌ Video recording & playback
5. ❌ Real-time facial landmarks
6. ❌ Candidate behavior analysis
7. ❌ Audio tone analysis
8. ❌ Video transcription/subtitles

### No Dependencies:
- ❌ TensorFlow.js
- ❌ MediaPipe (Google's body/hand/face detection)
- ❌ face-api.js
- ❌ ml5.js
- ❌ OpenCV.js
- ❌ PyTorch video models

**Package.json Analysis:**
- Video/ML dependencies: **NONE**
- Media libraries: pdfjs-dist (PDF only), mammoth (Word docs)
- No WebRTC recording libraries

---

## 📁 Complete File Structure

```
src/app/
├── pages/
│   ├── video-interview-room-page/
│   │   ├── video-interview-room-page.component.ts ⭐
│   │   ├── video-interview-room-page.component.html
│   │   └── video-interview-room-page.component.scss
│   └── candidate-entretiens-page/
│       ├── candidate-entretiens-page.component.ts
│       ├── candidate-entretiens-page.component.html
│       └── candidate-entretiens-page.component.scss
│
├── recruiter-dashboard/
│   ├── rd-interviews/
│   │   ├── rd-interviews.ts ⭐
│   │   ├── rd-interviews.html
│   │   └── rd-interviews.scss
│   └── rd-manage-jobs/
│       ├── rd-manage-jobs.component.ts ⭐
│       ├── rd-manage-jobs.component.html
│       └── rd-manage-jobs.component.scss
│
├── admin-dashboard/
│   └── entretien-list/
│       ├── entretien-list.component.ts
│       ├── entretien-list.component.html
│       └── entretien-list.component.scss
│
├── api.service.ts ⭐ (Interview & AI endpoints)
└── Nesrineai/
    └── data/
        ├── questions.json ⭐ (Seed dataset)
        └── questions_expanded.json (Expanded dataset)

src/
├── api.py ⭐ (Python AI backend)
├── model.py ⭐ (PyTorch question generator)
├── dataset.py ⭐ (Dataset & tokenizer)
├── train.py (Model training - standalone)
└── prepare_dataset.py (Dataset preparation)

saved_model/
├── model.pt ⭐ (Trained model)
└── vocab.json ⭐ (Vocabulary)
```

---

## 🔗 Routing Configuration

**Location:** [src/app/app.routes.ts](src/app/app.routes.ts)

```typescript
// Public Routes
{ path: 'candidate-entretiens', component: CandidateEntretiensPageComponent }
{ path: 'entretiens/video/:id', component: VideoInterviewRoomPageComponent }
{ path: 'entretiens/test/:id', component: PublicTestPassPageComponent }

// Recruiter Dashboard
{ path: 'recruiter-dashboard/interviews', component: RdInterviews }

// Admin Dashboard
{ path: 'admin/entretiens', component: EntretienListComponent }
```

---

## 🔐 Authentication & Authorization

**Interview Access Control:**
- Candidates: Can view/join their own interviews
- Recruiters: Can create, edit, view all their interviews
- Admins: Full system oversight

**Question Creation Authorization:**
```
POST /api/questions/entretien/** requires ROLE_RECRUTEUR
```

---

## 📊 Interview Data Model

### Key Fields:
```typescript
{
  id: number
  titre: string
  description: string
  type: 'TECHNIQUE' | 'RH' | 'MANAGERIAL' | 'FINAL' | 'PRESELECTION' | 'TEST'
  mode: 'QUESTIONS' | 'VIDEO'
  meetingLink: string (Jitsi URL for VIDEO mode)
  domaine: string (job domain/field)
  dateEntretien: string (ISO date)
  candidatId: number
  offreId: number
  photo: string
  seuilReussite: number (0-100, passing score)
  dureeMinutes: number (expected duration)
  
  // Results
  score?: number (0-100)
  resultat?: {
    score?: number
    scoreFinal?: number
    note?: number
    totalQuestions?: number
    bonnesReponses?: number
    decision?: string
    commentaire?: string
  }
}
```

---

## 🎯 Key Observations

### Strengths:
✅ Functional video interview infrastructure via Jitsi Meet  
✅ AI-powered question generation system (Groq/HuggingFace)  
✅ Comprehensive scoring system for interviews  
✅ Role-based access control  
✅ Interview management dashboard for recruiters  
✅ Candidate-facing interview list  
✅ Admin oversight tools  
✅ Custom ML model for question generation  

### Limitations:
❌ No video/emotion analysis capabilities  
❌ No recording/playback system  
❌ No real-time candidate metrics  
❌ No behavioral assessment features  
❌ Manual score entry (not auto-calculated)  
❌ Scoring from backend responses only  

---

## 💡 Recommendations for Enhancement

### For Emotion Detection:
1. Add MediaPipe Face Detection for real-time face tracking
2. Integrate TensorFlow.js emotion classification model
3. Track engagement metrics during video interview
4. Store video/emotion data for post-interview analysis

### For Video Features:
1. Add recording capability (WebRTC or server-side)
2. Implement playback for post-interview review
3. Add transcription/subtitle generation
4. Include video quality indicators

### For Better Scoring:
1. Auto-calculate scores from responses
2. Add multi-factor scoring (video + answers + emotions)
3. Create scoring rubric system
4. Add weighted scoring for different assessment types

---

## 📝 Notes

- **Interview Module is PRODUCTION-READY** for question-based and basic video interviews
- **AI System** focuses on intelligent question generation, NOT video analysis
- **Emotion Detection would require NEW implementation** (separate from existing system)
- **Jitsi Meet** is lightweight and requires no additional infrastructure
- **Python backend** can be extended for video analysis if needed

