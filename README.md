# 🏛️ Pune South-East Constituency Development & Intelligence Platform

An AI-powered, multi-criteria decision-support system built for **District Planning Committees (DPC)** and **Members of Parliament (MP)** to ingest multilingual citizen suggestions, automatically cluster public requests, and optimize municipal budget allocations with absolute transparency and compliance.

---

## 🚀 Key Architectural Pillars

### 1. Multimodal Citizen Intake Pipeline
* **Adaptive Local Voice Recording**: Captures audio notes directly in the browser via the HTML5 `MediaRecorder` API. Resilient to network blocks or privacy extensions by performing direct binary uploads to Supabase `voice-submissions` Storage.
* **Server-side Multimodal Transcription**: Uses **Gemini 2.5 Flash** to translate and transcribe voice notes in Marathi, Hindi, and English, outputting structured JSON suggestions.
* **Image Evidence OCR**: Allows citizens to upload photos of local issues (e.g. road damage, water leaks). The server extracts visual evidence details and maps them to structural databases.
* **GPS Verification Tagging**: Secures authentic local submissions by pinning precise geographical coordinates using the browser's Geolocation API.

### 2. Demographic & Regional Hotspot Map
* Interactive GIS layout powered by **Leaflet.js**, displaying geolocated citizen pins (Saffron dots) alongside ward boundary circles.
* Visualizes regional census metrics including ward populations, equity deficit scores (0-10 scale), active demand clusters, and overall request volumes.
* Dynamically filters all dashboard analytics based on active ward clicks.

### 3. AI-Powered Semantic Ingestion & Clustering
* **De-duplication**: Filters spam and duplicate campaigns using Jaccard Similarity token evaluation (ignoring short articles and noise words).
* **Semantic Routing**: Auto-assigns suggestions to municipal categories (Water, Roads, Health, Education, Sanitation, Skills).
* **Demand Clustering**: Groups individual citizen suggestions into consolidated **Demand Clusters** to represent general municipal needs.

### 4. Dynamic Budget Optimization Solver (Knapsack DP)
Implements a scaled **Dynamic Programming Knapsack Solver** ($O(N \cdot W)$) to find the absolute maximum value portfolio under a strict budgetary cap. It supports four planning philosophies:
* **Standard Balanced**: Maximizes a multi-criteria score weighted across Citizen Demand, Ward Population, Infrastructure Gaps, Equity Deficit, Urgency, Feasibility, Political Alignment, and Trust.
* **Max ROI**: prioritizes projects returning the highest citizen utility volume per rupee spent.
* **Max Equity**: Weights priority heavily towards historically underserved, high equity deficit wards.
* **Max Urgency**: Targets immediate structural issues (e.g., water contamination or road collapse).

### 5. Human-in-the-Loop Ingestion & Traceability Audit
* **AI Ingestion Audit Workspace**: Low-confidence classifications (under 70% confidence) are routed to a manual verification queue for human verification.
* **Traceability Decision Audit Logs**: Implements an immutable log of all MP decisions (Status transitions, Preset Weights adjustment, and Approvals) for public accountability.

---

## 🛠️ Technology Stack

* **Framework**: Next.js 16 (App Router)
* **Styling**: Tailwind CSS
* **Database & Storage**: Supabase (PostgreSQL)
* **AI Engine**: Gemini 2.5 Flash API
* **Mapping**: Leaflet.js / React-Leaflet
* **Testing**: Local Performance & Burst Rate Limit stress test suite

---

## 📂 Project Structure

```
├── app/
│   ├── api/
│   │   ├── projects/       # API: Priority scoring & Knapsack optimizer
│   │   ├── stats/          # API: Aggregated regional analytics
│   │   └── submissions/    # API: Multilingual citizen intake & tracking
│   ├── mp/
│   │   └── page.js         # Dashboard workspace for MP & DPC Staff
│   ├── layout.js           # Base layout wrapper
│   └── page.js             # Public Citizen Submission Portal
├── components/
│   └── HotspotMap.js       # Leaflet.js Mapping Component
├── db/
│   └── schema.sql          # PostgreSQL table schemas & vector extension
├── lib/
│   ├── clustering.js       # De-duplication and cluster assignment
│   ├── optimizer.js        # DP Knapsack mathematical allocation
│   ├── parser.js           # Gemini Multimodal parser & translation
│   ├── security.js         # Rate limiting & XSS input sanitization
│   ├── scoring.js          # Project priority calculations
│   └── supabase.js         # Supabase database connection and seeder
├── scratch/
│   ├── stress-test.js      # Automated performance & rate limit tests
│   └── test-supabase-all-tables.js  # Database schema checklist
```

---

## 🛢️ Database Schema (`db/schema.sql`)

The database uses PostgreSQL with the `pgvector` extension. Key tables:

```sql
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Citizen Submissions
CREATE TABLE submissions (
    id TEXT PRIMARY KEY,
    user_name TEXT NOT NULL,
    raw_text TEXT,
    audio_url TEXT,
    image_url TEXT,
    language TEXT NOT NULL,
    channel TEXT NOT NULL, -- Web Form, Voice Note, OCR Image
    gps_lat DOUBLE PRECISION,
    gps_lng DOUBLE PRECISION,
    embedding vector(384),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Structuring Details
CREATE TABLE extracted_issues (
    id SERIAL PRIMARY KEY,
    submission_id TEXT UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- education, roads, water, health, sanitation, skill
    issue_details TEXT NOT NULL,
    ward_id INTEGER REFERENCES wards(id) ON DELETE SET NULL,
    confidence_score DOUBLE PRECISION NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_review', -- pending_review, verified, rejected
    trust_score DOUBLE PRECISION NOT NULL,
    is_campaign BOOLEAN DEFAULT FALSE
);

-- Aggregated Municipal Clusters
CREATE TABLE demand_clusters (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL,
    ward_id INTEGER REFERENCES wards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    citizen_count INTEGER DEFAULT 0,
    spam_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active'
);

-- Consolidated Projects
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    cluster_id INTEGER UNIQUE REFERENCES demand_clusters(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    ward_id INTEGER NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
    estimated_cost INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'Proposed', -- Proposed, Approved, Tendering, Construction, Completed
    citizen_rating DOUBLE PRECISION
);
```

---

## ⚙️ Local Development Setup

### 1. Environment Configuration
Create a `.env.local` file in your root folder:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-for-migrations
GEMINI_API_KEY=your-gemini-api-key
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Initialize & Seed Database
Run the tables verification script to check your Supabase schema:
```bash
node scratch/test-supabase-all-tables.js
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) for the Citizen Portal, and [http://localhost:3000/mp](http://localhost:3000/mp) for the MP Dashboard.

---

## 🔬 Performance & Verification Testing

To execute rate limiting stress tests, concurrency load tests, and algorithmic unit tests:
```bash
node scratch/stress-test.js
```

### Output expectations:
* **Algorithmic unit tests**: Checks Jaccard similarities, Knapsack edge cases, and XSS sanitizers.
* **Performance load tests**: Performs 100 concurrent allocation recalculations (Median latency expected `< 1ms`).
* **Stress tests**: Sends 500 rapid requests to verify API rate limiting burst capacity limits.

---

## 🏛️ Governance Accountability Statement
All actions taken by administrators or elected representatives within this platform are written to the database audit logs. The system guarantees that priority scores are computed strictly based on verifiable local indicators, eliminating arbitrary planning bias and ensuring equity-driven public development.
