# Recommendation System Implementation Guide

## Overview

The recommendation system consists of two main components:

1. **Spring Boot Backend Service** - Calculates matching scores and orchestrates recommendations
2. **Flask ML API** - Serves pre-trained machine learning models for predictions

## Architecture

```
Frontend (Angular)
    ↓
Spring Boot REST API (/api/recommendations)
    ├─ Calculate S-scores (skills, experience, location, domain)
    ├─ Call Flask ML API for predictions
    └─ Store results in database
    ↓
Flask API (Port 5000)
    ├─ Load trained models (GradientBoosting, RandomForest)
    ├─ Normalize input scores
    └─ Return predictions (Scoreglobal + Classifications)
    ↓
MySQL Database
    └─ Store CandidateRecommendation records
```

## Backend Setup

### Step 1: Add Database Migration

Run this SQL to create the recommendations table:

```sql
CREATE TABLE `candidate_recommendations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `offre_id` bigint NOT NULL,
  `candidat_id` bigint NOT NULL,
  `s_skills` double NOT NULL,
  `s_experience` double NOT NULL,
  `s_location` double NOT NULL,
  `s_domain` double NOT NULL,
  `scoreglobal` double NOT NULL,
  `recommendation_level` varchar(50) NOT NULL,
  `binary_classification` varchar(30) NOT NULL,
  `match_details` json,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_offre_candidat` (`offre_id`,`candidat_id`),
  KEY `idx_scoreglobal` (`scoreglobal`),
  KEY `idx_recommendation_level` (`recommendation_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Step 2: Verify Spring Boot Configuration

The following files have been created in your backend:

**Entity:**
- `src/main/java/t/esprit/arctic/jobmatch/entity/CandidateRecommendation.java`

**DTOs:**
- `src/main/java/t/esprit/arctic/jobmatch/dto/CandidateRecommendationDTO.java`
- `src/main/java/t/esprit/arctic/jobmatch/dto/MatchingScoresDTO.java`
- `src/main/java/t/esprit/arctic/jobmatch/dto/RecommendationRequest.java`
- `src/main/java/t/esprit/arctic/jobmatch/dto/RecommendationResponse.java`

**Services:**
- `src/main/java/t/esprit/arctic/jobmatch/service/MatchingScoreCalculatorService.java`
- `src/main/java/t/esprit/arctic/jobmatch/service/RecommendationService.java`

**Repository:**
- `src/main/java/t/esprit/arctic/jobmatch/repository/CandidateRecommendationRepository.java`

**Controller:**
- `src/main/java/t/esprit/arctic/jobmatch/controller/RecommendationController.java`

### Step 3: Update Application Configuration

The `application.properties` has been updated with:

```properties
# Flask Recommendation API
flask.recommendation.url=http://localhost:5000/api/recommend
flask.recommendation.enabled=false  # Set to true when Flask is running
```

## Flask ML API Setup

### Step 1: Prepare Model Files

You need to have these files in `saved_model/` directory:

```
saved_model/
├── gbr_model.joblib          # Trained GradientBoosting Regressor
├── rf_classifier_multi.joblib # Trained RandomForest Classifier
├── scaler.joblib              # MinMaxScaler fitted object
└── (other model files if needed)
```

**To export your models from the notebook:**

```python
import joblib
from sklearn.preprocessing import MinMaxScaler

# After training your models in the notebook:
joblib.dump(gbr, 'saved_model/gbr_model.joblib')
joblib.dump(rf_classifier_multi, 'saved_model/rf_classifier_multi.joblib')
joblib.dump(scaler, 'saved_model/scaler.joblib')
```

### Step 2: Install Flask Dependencies

```bash
cd PI-Backend
pip install -r flask_requirements.txt
```

Or manually:
```bash
pip install Flask==3.0.0 scikit-learn==1.4.0 joblib==1.3.2 numpy==1.24.3
```

### Step 3: Run Flask API

```bash
# Set environment variables (optional)
export FLASK_HOST=0.0.0.0
export FLASK_PORT=5000
export MODEL_DIR=./saved_model
export FLASK_DEBUG=false

# Run the server
python flask_recommendation_api.py
```

Or with more verbose output:

```bash
FLASK_DEBUG=true python flask_recommendation_api.py
```

The Flask API will be available at: `http://localhost:5000`

### Step 4: Enable Flask in Spring Boot

Once Flask is running and tested, update `application.properties`:

```properties
flask.recommendation.enabled=true
```

Then restart Spring Boot.

## API Endpoints

### 1. Get Single Recommendation

```http
GET /api/recommendations/candidate/{candidatId}/offre/{offreId}

Example:
GET /api/recommendations/candidate/1/offre/5

Response:
{
  "id": 1,
  "candidatId": 1,
  "candidatNom": "John Doe",
  "offreId": 5,
  "offreTitre": "Senior Developer",
  "sSkills": 0.85,
  "sExperience": 0.90,
  "sLocation": 0.70,
  "sDomain": 0.80,
  "scoreglobal": 81.25,
  "recommendationLevel": "Très recommandé",
  "binaryClassification": "Bon candidat",
  "createdAt": "2026-04-20T10:30:00",
  "matchDetails": "Skills: 85.00%, Experience: 90.00%, Location: 70.00%, Domain: 80.00%"
}
```

### 2. Get Top Candidates for a Job

```http
GET /api/recommendations/offre/{offreId}/top-candidates?limit=10

Example:
GET /api/recommendations/offre/5/top-candidates?limit=5

Response:
[
  {
    "candidatId": 1,
    "candidatNom": "John Doe",
    "scoreglobal": 81.25,
    "recommendationLevel": "Très recommandé"
  },
  {
    "candidatId": 2,
    "candidatNom": "Jane Smith",
    "scoreglobal": 71.50,
    "recommendationLevel": "Recommandé"
  },
  ...
]
```

### 3. Get Recommended Jobs for a Candidate

```http
GET /api/recommendations/candidate/{candidatId}/recommended-offres?limit=10

Example:
GET /api/recommendations/candidate/1/recommended-offres?limit=5

Response:
[
  {
    "candidatId": 1,
    "offreId": 5,
    "offreTitre": "Senior Developer",
    "scoreglobal": 81.25,
    "recommendationLevel": "Très recommandé"
  },
  {
    "candidatId": 1,
    "offreId": 7,
    "offreTitre": "Team Lead - Backend",
    "scoreglobal": 75.00,
    "recommendationLevel": "Recommandé"
  },
  ...
]
```

### 4. Get Candidates by Level

```http
GET /api/recommendations/offre/{offreId}/level/{level}?limit=10

Levels: "Très recommandé", "Recommandé", "Moyen", "Faible match"

Example:
GET /api/recommendations/offre/5/level/Très%20recommandé?limit=10

Response:
[
  {...},
  {...}
]
```

### 5. Generate Batch Recommendations for a Job

```http
POST /api/recommendations/batch/offre/{offreId}

Example:
POST /api/recommendations/batch/offre/5

Response:
{
  "status": "success",
  "offreId": 5,
  "total": 150,
  "recommendations": [...]
}
```

### 6. Generate Batch Recommendations for a Candidate

```http
POST /api/recommendations/batch/candidate/{candidatId}

Example:
POST /api/recommendations/batch/candidate/1

Response:
{
  "status": "success",
  "candidatId": 1,
  "total": 45,
  "recommendations": [...]
}
```

### 7. Health Check

```http
GET /api/recommendations/health

Response:
{
  "status": "Recommendation service is running"
}
```

## Testing the System

### Step 1: Test Flask API

```bash
curl -X POST http://localhost:5000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "s_skills": 0.85,
    "s_experience": 0.90,
    "s_location": 0.70,
    "s_domain": 0.80
  }'

# Expected response:
# {
#   "Scoreglobal": 81.25,
#   "binary_classification": "Bon candidat",
#   "multi_class_classification": "Très recommandé"
# }
```

### Step 2: Test Spring Boot with Flask Disabled (Using Defaults)

```bash
# Set flask.recommendation.enabled=false in application.properties

curl http://localhost:8080/api/recommendations/health

curl -X GET http://localhost:8080/api/recommendations/candidate/1/offre/1
```

### Step 3: Enable Flask and Test End-to-End

```bash
# Set flask.recommendation.enabled=true in application.properties
# Restart Spring Boot

curl -X GET http://localhost:8080/api/recommendations/candidate/1/offre/1
```

## Matching Scores Explained

### S_Skills (Skills Match)
- **Calculation**: Intersection of candidate competences vs job required competences
- **Range**: 0.0 (no match) to 1.0 (perfect match)
- **Source**: `Candidat.competences` vs `OffreEmploi.competencesRequises`

### S_Experience (Experience Match)
- **Calculation**: Compare candidate's total years vs job requirement
- **Range**: 0.0 (no experience) to 1.0 (meets or exceeds requirement)
- **Source**: Sum of `(Background.dateFin - Background.dateDebut)` for all backgrounds
- **Job Requirement**: Extracted from job description or default to 2 years

### S_Location (Location Match)
- **Calculation**: City/Country matching
- **Range**: 1.0 (exact match) → 0.7 (partial) → 0.4 (same country) → 0.2 (different)
- **Source**: `Candidat.localisation` vs `OffreEmploi.location`

### S_Domain (Domain/Field Match)
- **Calculation**: Education domain matching with job title/description
- **Range**: 1.0 (exact match) → 0.7 (similar) → 0.3 (related) → 0.2 (no relation)
- **Source**: `Candidat.educations[0].domain` vs `OffreEmploi.titre` + `OffreEmploi.description`

## Recommendation Levels

| Level | Score Range | Meaning |
|-------|------------|---------|
| **Très recommandé** | ≥ 80 | Excellent match, high priority |
| **Recommandé** | 60-79 | Good match, worth considering |
| **Moyen** | 40-59 | Average match, possible candidate |
| **Faible match** | < 40 | Poor match, unlikely fit |

## Troubleshooting

### Flask Not Connecting

**Error**: `Connection refused` or `Unable to connect to Flask API`

**Solution**:
1. Verify Flask is running on port 5000
2. Check `flask.recommendation.enabled=true` in properties
3. Check Flask URL is correct: `http://localhost:5000/api/recommend`
4. Set `flask.recommendation.enabled=false` to use default scoring

### Model Files Not Found

**Error**: `FileNotFoundError` when Flask starts

**Solution**:
1. Ensure files exist in `saved_model/` directory:
   - `gbr_model.joblib`
   - `rf_classifier_multi.joblib`
   - `scaler.joblib`
2. Export models from your Python notebook
3. Copy to the correct `MODEL_DIR`

### Scores Out of Range

**Error**: `ValueError: All scores must be between 0 and 1`

**Solution**:
1. Verify matching score calculator is normalizing correctly
2. Check that S-score calculations produce values in [0, 1]
3. The `MatchingScoreCalculatorService` should handle normalization

### No Candidates Found

**Issue**: Batch recommendation returns empty list

**Solutions**:
1. Ensure candidates exist in database
2. Verify educational data and backgrounds are populated
3. Check matching scores are being calculated (may be non-matching)
4. Review logs for specific candidate-offre pairs

## Performance Optimization

### Batch Processing

For large datasets, use batch endpoints:

```java
// Instead of calling endpoint 1000 times:
POST /api/recommendations/batch/offre/{id}

// This processes all candidates for one job in one request
```

### Database Indexes

The `CandidateRecommendation` table includes:
- `idx_offre_candidat` - For finding specific recommendations
- `idx_scoreglobal` - For sorting by score
- `idx_recommendation_level` - For filtering by level

### Caching

Consider adding Spring Cache annotations:

```java
@Cacheable(value = "recommendations", key = "#offreId")
public List<CandidateRecommendationDTO> getTopCandidatesForOffre(Long offreId, int limit) {
    ...
}
```

## Next Steps

1. **Export your models** from the notebook to `.joblib` files
2. **Start Flask API** with your trained models
3. **Test Flask independently** with sample data
4. **Enable Flask in Spring Boot** (`flask.recommendation.enabled=true`)
5. **Create Angular component** to display recommendations in frontend
6. **Test end-to-end** workflow
7. **Monitor performance** and optimize as needed

## Additional Resources

- Model Training Notebook: `matchykhedma.ipynb`
- Data Format: See `MatchingScoresDTO` and sample data in notebook
- Database Schema: SQL migration above
