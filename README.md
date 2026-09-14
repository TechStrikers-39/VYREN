# VYREN — Competency Intelligence & Adaptive Learning Platform

<div align="center">

[![Smart India Hackathon](https://img.shields.io/badge/SIH-2026-orange.svg)](https://sih.gov.in)
[![Ministry](https://img.shields.io/badge/MoSPI-Government%20of%20India-003366.svg)](https://mospi.gov.in)
[![Institution](https://img.shields.io/badge/NSSTA-Statistical%20Academy-1B3A6B.svg)](https://nssta.gov.in)
[![Framework](https://img.shields.io/badge/Mission%20Karmayogi-CBC%20FRAC%20Aligned-16A34A.svg)](https://karmayogibharat.gov.in)
[![Stack](https://img.shields.io/badge/Architecture-React%20%7C%20FastAPI%20%7C%20Supabase-2563EB.svg)](#architecture)

<br/>

**Transforming Official Statistical Workforce Competencies Through Deterministic Measurement, Adaptive Learning, and Live iGOT Karmayogi Integration.**

[Key Innovations](#key-innovations) • [Architecture](#architecture) • [Persona Workspaces](#persona-workspaces) • [Getting Started](#getting-started) • [Verification Suite](#automated-test--verification-suite)

</div>

---

## Executive Overview

**VYREN** (*वयरेन*) is an enterprise-grade Competency Intelligence and Adaptive Capacity-Building Platform designed specifically for India's **Official Statistical System (OSS)**, administered by the **Ministry of Statistics and Programme Implementation (MoSPI)** and the **National Statistical Systems Training Academy (NSSTA)** in alignment with the **Capacity Building Commission (CBC)** under **Mission Karmayogi**.

Modern statistical governance demands high agility across survey sampling, enterprise ETL data pipelines, big data analytics, Machine Learning Operations (MLOps), and strict adherence to the **Digital Personal Data Protection (DPDP) Act 2023**. VYREN replaces static, one-size-fits-all training schedules with a continuous, closed-loop competency lifecycle:

$$\text{Cadre Intake} \longrightarrow \text{Deterministic Assessment} \longrightarrow \text{Skill-Gap Detection} \longrightarrow \text{Live iGOT Course Matching} \longrightarrow \text{Continuous Recalibration}$$

---

## Key Innovations

### 1. Deterministic Competency Measurement (Levels 0–4)
Unlike generic LMS platforms that rely on raw percentage test scores or subjective self-reporting, VYREN implements a mathematical proficiency framework mapped to the national **Framework for Roles, Activities and Competencies (FRAC)**:
- **Level 0 (Foundational):** Awareness of elementary definitions and survey frameworks.
- **Level 1 (Working):** Procedural execution under supervisory guidance.
- **Level 2 (Autonomous):** Independent practical application on official statistical datasets.
- **Level 3 (Advanced):** Complex methodological problem-solving, pipeline optimization, and anomaly resolution.
- **Level 4 (Expert / Master):** Statistical system design, methodology authoring, regulatory compliance, and audit leadership.
- **Confidence & Evidence Modeling:** Every measured score includes a Bayesian confidence metric based on item discrimination, difficulty variance, and time-per-question telemetry.

### 2. Live Sunbird / iGOT Karmayogi Catalog Integration
VYREN connects natively to the **DoPT iGOT Karmayogi Sunbird API** (`https://igotkarmayogi.gov.in`), allowing learners to query official national courses and automatically mapping detected skill gaps to certified government curriculum modules.

### 3. Automated 9-Stage Pedagogical Quality Control Pipeline
Built for NSSTA trainers and CBC assessors, VYREN's assessment studio features an automated **9-stage quality assurance gate** that validates AI-generated assessment candidates against strict psychometric criteria:
1. **Lexical & Length Homogeneity** (prevents giveaway outlier options)
2. **Pedagogical Integrity** (bans "All of the above" / "None of the above")
3. **Bloom's Taxonomy Concordance** (matches target cognitive level)
4. **MoSPI Cadre Context Relevance** (grounded in actual survey and national accounting scenarios)
5. **Key Discrimination & Distractor Feasibility**
6. **Bias & Neutrality Verification**
7. **Negative Framing Audit**
8. **Deterministic Scoring Key Validation**
9. **FRAC Competency Alignment & Metadata Integrity**

### 4. Competency-Anchored AI Assistant
Powered by **Google Gemini**, the assistant is dynamically primed with the authenticated officer's measured diagnostic levels, high-priority skill gaps, and specific MoSPI cadre requirements—serving as a dedicated capacity-building mentor rather than an open-ended conversational bot.

### 5. Cryptographically Signed Official Evaluation Records
Completed diagnostic evaluations generate formal NSSTA-compliant digital certificates featuring **SHA-256 cryptographic verification hashes**, item-level evidence trails, and print-ready formal records.

---

## Three Dedicated Persona Workspaces

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            VYREN PLATFORM SHELL                             │
├──────────────────────┬──────────────────────────────┬───────────────────────┤
│  LEARNER WORKSPACE   │      TRAINER WORKSPACE       │   ADMIN WORKSPACE     │
│  (MoSPI Officers)    │   (NSSTA / CBC Faculty)      │ (Ministry Leadership) │
├──────────────────────┼──────────────────────────────┼───────────────────────┤
│ • Context Intake     │ • Assessment Studio          │ • Workforce Matrix    │
│ • Diagnostic Suite   │ • 9-Stage QC Gate            │ • Macro Gap Heatmaps  │
│ • Skill-Gap Radar    │ • Item Bank Management       │ • Telemetry Dashboard │
│ • Adaptive Path      │ • Cohort Readiness Roster    │ • Secure CSV Export   │
│ • iGOT Course Bridge │ • Psychometric Analytics     │ • RBAC Governance     │
│ • Gemini Assistant   │ • Candidate Review / Adopt   │ • Live System Health  │
└──────────────────────┴──────────────────────────────┴───────────────────────┘
```

---

## Architecture & Technology Stack

```
[ Frontend: React 18 + TypeScript + Vite + Tailwind CSS + WebGL ]
                            │
                     HTTPS / REST API
                            │
                            ▼
[ Backend API: FastAPI (Python 3.11) + Pydantic v2 + Gotrue ]
     │                      │                          │
     ▼                      ▼                          ▼
[ Supabase Cloud ]  [ Google Gemini API ]  [ Live Sunbird iGOT API ]
- PostgreSQL 15     - MCQ Quality Gate     - Karmayogi Search
- Auth & RBAC       - Cadre Assistant      - FRAC Mappings
- Row Level Security- Rationale Analysis   - W3C Passports
```

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, OGL / WebGL canvas shaders.
- **Backend:** FastAPI, Uvicorn, Pydantic v2, HTTPX, PyJWT, Gotrue Python client.
- **Database & Security:** Supabase (PostgreSQL with RLS), OAuth 2.0 (Google & Email Auth), Role-Based Access Control (`learner`, `trainer`, `admin`).
- **Intelligence Engine:** Google Gemini with strict structured JSON output parsing.
- **External Integration:** Sunbird API client interfacing with live iGOT Karmayogi portal.

---

## Repository Structure

```text
VYREN/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI REST endpoints (auth, learner, trainer, admin, igot)
│   │   ├── core/            # Config, security dependencies, JWT validation, RBAC
│   │   ├── schemas/         # Pydantic data contracts and validation models
│   │   ├── services/        # Scoring math, 9-stage validator, Gemini AI, Sunbird iGOT client
│   │   └── utils/           # Supabase client singleton and cryptographic hashing
│   └── requirements.txt     # Python backend dependencies
├── src/
│   ├── app/                 # Root router and application providers
│   ├── components/
│   │   ├── assessment/      # Evidence breakdown, review modals, question navigation
│   │   ├── assistant/       # AI message bubble, suggested prompts, typing indicator
│   │   ├── catalog/         # Live Sunbird iGOT course search interface
│   │   ├── competency/      # Competency radar, skill gap heatmap, level gauges
│   │   ├── learning/        # Adaptive learning path timeline
│   │   ├── navigation/      # Unified topbar, role-based sidebar, protected routes
│   │   └── ui/              # Buttons, badges, cards, atmospheric wave canvas
│   ├── constants/           # Route definitions and system constants
│   ├── contexts/            # AuthContext, AssessmentContext
│   ├── layouts/             # PublicLayout, LearnerLayout, TrainerLayout, AdminLayout
│   ├── pages/               # Persona-specific screen implementations
│   └── services/            # API clients and data mappers
├── supabase/
│   └── migrations/          # PostgreSQL schema DDL, RLS policies, and seed data
└── scratch/                 # Automated test verification suite
```

---

## Getting Started

### Prerequisites
- **Node.js** 18.x or higher
- **Python** 3.10 or 3.11
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/TechStrikers-39/VYREN.git
cd VYREN
```

### 2. Backend Setup
```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env  # Configure your Supabase and Gemini API credentials
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup
```bash
# In the repository root:
npm install
npm run dev -- --port 3000
```
Open **`http://localhost:3000`** in your browser.

---

## Automated Test & Verification Suite

VYREN includes a comprehensive automated test suite verifying production RBAC, deterministic scoring mathematics, Gemini AI generation, and live Sunbird iGOT flows:

```bash
# Run the master production workflow regression audit:
backend\.venv\Scripts\python.exe scratch\test_production_workflow_pass.py

# Run API authentication, Google OAuth & onboarding verification:
backend\.venv\Scripts\python.exe scratch\test_api_auth_and_onboarding_pass.py
```

---

## Team TechStrikers-39

Developed with pride for **Smart India Hackathon 2026** (Internal Round Qualified).

*Built for India's Official Statistical System • Ministry of Statistics and Programme Implementation (MoSPI) • NSSTA • Mission Karmayogi*
