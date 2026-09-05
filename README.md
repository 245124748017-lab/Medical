# MedLens — AI-Powered Clinical Information Intelligence

MedLens is an AI-powered clinical information organizer that converts fragmented patient information and medical reports into a **structured, understandable, traceable, and reviewable patient record**.

> [!IMPORTANT]
> **CLINICAL SAFETY DIRECTIVE:** MedLens functions strictly as a clinical information organization and workflow tool. It does NOT diagnose diseases, prescribe treatments, or adjust medications.

---

## 1. Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router v6, Axios, Recharts, Lucide React icons
- **Backend**: Node.js, Express.js, MongoDB, Mongoose, Multer for file uploads
- **AI**: Google Gemini API (`@google/generative-ai`) using model `gemini-3.1-flash-lite` for strict schema extraction, conflict detection, and patient-friendly summarization
- **Authentication**: Firebase Authentication (Email/Password, Google Sign-in) with automatic Demo Clinician access for evaluations
- **Deployment Target**: Google Cloud Run (Containerized via Multi-Stage Dockerfile)

---

## 2. Architecture & Directory Layout

```text
medlens/
├── frontend/
│   ├── src/
│   │   ├── components/     # ProvenanceBadge, StatusBadge, Stepper, Sidebar, Banner
│   │   ├── context/        # AuthContext, ToastContext
│   │   ├── layouts/        # DashboardLayout
│   │   ├── pages/          # Landing, Login, Dashboard, Intake, Record, Upload, Verify, Compare, Timeline
│   │   ├── services/       # Axios API client, Firebase client
│   │   ├── App.jsx         # App router
│   │   └── main.jsx
│   ├── public/             # Static public assets
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   ├── package.json
│   ├── .gitignore
│   └── .env.example
│
├── backend/
│   ├── config/             # DB & Firebase configuration
│   ├── controllers/        # Patient, Report, Dashboard, Audit
│   ├── middleware/         # Auth (Firebase + Demo), Multer upload validation
│   ├── models/             # Mongoose schemas (User, Patient, MedicalReport, LabResult, AuditLog)
│   ├── routes/             # REST APIs (/api/patients, /api/reports, /api/dashboard)
│   ├── services/           # Gemini extraction, Conflict engine, Patient summarizer
│   ├── utils/              # Reference range validator, Demo seeder
│   ├── uploads/            # Diagnostic report storage (.gitkeep only in repo)
│   ├── server.js           # Express API & production static server
│   ├── package.json
│   ├── .gitignore
│   └── .env.example
│
├── Dockerfile              # Multi-stage container build for Google Cloud Run
├── .dockerignore           # Excludes local node_modules, .env, and uploads from container
├── cloudbuild.yaml         # Google Cloud Build automated pipeline configuration
├── .gitignore              # Repository root git ignore (keeps repo < 10MB)
└── README.md
```

---

## 3. Core Clinical Capabilities

1. **Critical Reference Range Rule**:
   - Reference ranges come strictly and solely from the source report.
   - If the source document does not provide a reference range, status is strictly marked `CANNOT_DETERMINE` and `referenceRange = null`. Never invents or assumes medical ranges.
2. **Provenance & Audit Lineage**:
   - Every field carries explicit provenance: `USER_PROVIDED` → `AI_EXTRACTED` → `HUMAN_VERIFIED`.
   - Modifying any parameter creates an immutable `AuditLog` entry recording before/after values and reviewer attribution.
3. **Information Conflict & Identity Mismatch Detection**:
   - Detects mismatches between patient profile and uploaded report (e.g. Profile age 42 vs Report age 45).
   - Prevents silent overwriting. Provides 3 interactive clinician actions:
     - `[Use Report Information]`
     - `[Keep Existing Information]`
     - `[Review Manually]`
   - Warns on patient identity mismatch: *"Patient identity mismatch detected. Please verify that this report belongs to the selected patient."* and prevents automatic merging into patient record.
4. **Clean AI Error & Fallback Handling**:
   - If Gemini is unavailable (e.g. 403 or quota limits), the system returns a clean `AI_PROCESSING_UNAVAILABLE` state with safe guidance without showing fake/demo data or raw API errors.
   - Clinicians can manually add findings via `+ Add Diagnostic Result Manually`.
5. **Longitudinal Report Comparison**:
   - Side-by-side delta calculations and Recharts visualization over time.
   - Adheres to neutral, non-diagnostic phrasing.
6. **Patient-Friendly AI Summary**:
   - Plain-language synthesis of lab findings, technical glossary, and mandatory clinical disclaimers.

---

## 4. Local Development Setup

### Prerequisites
- Node.js v18+
- MongoDB running locally on port 27017 (or MongoDB Atlas URI)

### 1. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your GEMINI_API_KEY and MONGODB_URI
npm install
npm start
```
*Backend runs on `http://localhost:5000`*

### 2. Frontend Setup
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`*

---

## 5. Repository Size & GitHub Cleanliness (< 10 MB)

This repository is strictly configured to stay **well below the 10 MB GitHub limit**:
- **Total Tracked Codebase Size**: **~0.55 MB** (~580 KB across 62 files)
- **Excluded by `.gitignore`**:
  - `node_modules/`
  - `dist/` and `build/`
  - `.env` and `.env.*` secrets (only `.env.example` templates committed)
  - `backend/uploads/*` (medical reports/PDFs/images)
  - Generated AI models (`.pt`, `.onnx`, `.h5`, `.bin`, etc.)
  - Log files and IDE settings

### Verifying Staged Size
```bash
git status
git add .
git diff --cached --stat
```

---

## 6. Google Cloud Run Deployment Guide

MedLens is packaged with a multi-stage `Dockerfile` that builds the Vite frontend and serves both the static UI and Express API from a single production container on Google Cloud Run.

### Prerequisites for Cloud Run
1. [Google Cloud SDK (`gcloud`)](https://cloud.google.com/sdk/docs/install) installed and authenticated:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_GCP_PROJECT_ID
   ```
2. Enable required Google Cloud APIs:
   ```bash
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
   ```
3. A cloud-hosted MongoDB instance (such as a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster).

### Environment Variables for Cloud Run
When deploying to Cloud Run, configure the following environment variables:

| Variable | Description | Example / Note |
|---|---|---|
| `NODE_ENV` | Runtime environment | `production` |
| `PORT` | Container port (injected by Cloud Run) | `8080` |
| `MONGODB_URI` | Production MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/medlens` |
| `GEMINI_API_KEY` | Google Gemini API Key | Set from Google AI Studio |
| `FIREBASE_PROJECT_ID` | Firebase Project ID | `medlens-health` |

### Deployment Option A: One-Command Source Deploy (Recommended)
From the root repository directory:
```bash
gcloud run deploy medlens \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,MONGODB_URI=YOUR_MONGODB_ATLAS_URI,GEMINI_API_KEY=YOUR_GEMINI_API_KEY,FIREBASE_PROJECT_ID=medlens-health"
```

### Deployment Option B: Build with Cloud Build & Deploy Image
```bash
# 1. Build and push image via Cloud Build
gcloud builds submit --tag gcr.io/YOUR_GCP_PROJECT_ID/medlens:latest

# 2. Deploy the container image to Cloud Run
gcloud run deploy medlens \
  --image gcr.io/YOUR_GCP_PROJECT_ID/medlens:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,MONGODB_URI=YOUR_MONGODB_ATLAS_URI,GEMINI_API_KEY=YOUR_GEMINI_API_KEY,FIREBASE_PROJECT_ID=medlens-health"
```

### Deployment Option C: Local Docker Build & Test
```bash
# Build production container locally
docker build -t medlens .

# Run container locally on port 8080
docker run -p 8080:8080 \
  -e NODE_ENV=production \
  -e MONGODB_URI=YOUR_MONGODB_ATLAS_URI \
  -e GEMINI_API_KEY=YOUR_GEMINI_API_KEY \
  medlens
```
Visit `http://localhost:8080` in your browser.