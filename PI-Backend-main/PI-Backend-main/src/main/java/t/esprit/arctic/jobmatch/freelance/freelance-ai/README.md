# Freelance AI Backend

This folder contains a standalone FastAPI service with 3 AI features:

1. AI Matching Engine
2. AI Proposal Generator (Ollama `mistral`)
3. Price Prediction (XGBoost)

## Setup

```bash
cd back3/freelance-ai
python -m pip install -r requirements.txt
ollama pull mistral
python -c "import pricing; pricing.train(); print('price model trained')"
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Base URL (local): `http://localhost:8000`

---

## 1) Match Freelancers

**POST** `/api/match`

### Example request

```bash
curl -X POST "http://localhost:8000/api/match" \
  -H "Content-Type: application/json" \
  -d "{
    \"job\": {
      \"skills\": \"React Node.js API integration\",
      \"description\": \"Build a freelance dashboard with robust frontend and backend sync.\"
    },
    \"freelancers\": [
      {
        \"name\": \"Amine\",
        \"skills\": \"React, TypeScript, Node.js\",
        \"experience\": \"6 years building SaaS dashboards\",
        \"reviews\": \"Clients praise quality and on-time delivery\"
      },
      {
        \"name\": \"Sara\",
        \"skills\": \"Vue, Laravel\",
        \"experience\": \"4 years in web development\",
        \"reviews\": \"Great communication and clean code\"
      }
    ]
  }"
```

---

## 2) Generate Proposal

**POST** `/api/proposal`

### Example request

```bash
curl -X POST "http://localhost:8000/api/proposal" \
  -H "Content-Type: application/json" \
  -d "{
    \"job_description\": \"Need a dashboard for managing projects, invoices, and contracts.\",
    \"skills\": \"React, Node.js, API design, UX\",
    \"experience_years\": 7,
    \"timeline_days\": 10
  }"
```

---

## 3) Stream Proposal

**POST** `/api/proposal/stream`

### Example request (stream)

```bash
curl -N -X POST "http://localhost:8000/api/proposal/stream" \
  -H "Content-Type: application/json" \
  -d "{
    \"job_description\": \"Need a dashboard for managing projects, invoices, and contracts.\",
    \"skills\": \"React, Node.js, API design, UX\",
    \"experience_years\": 7,
    \"timeline_days\": 10
  }"
```

---

## 4) Predict Price Range

**POST** `/api/price`

### Example request

```bash
curl -X POST "http://localhost:8000/api/price" \
  -H "Content-Type: application/json" \
  -d "{
    \"skill\": \"React\",
    \"experience_years\": 5,
    \"rating\": 4.6,
    \"location\": \"Remote\"
  }"
```
