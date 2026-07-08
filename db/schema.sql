-- Enable the pgvector extension to store and search embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS decision_logs CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS cluster_mappings CASCADE;
DROP TABLE IF EXISTS demand_clusters CASCADE;
DROP TABLE IF EXISTS extracted_issues CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS health_indicators CASCADE;
DROP TABLE IF EXISTS water_indicators CASCADE;
DROP TABLE IF EXISTS road_indicators CASCADE;
DROP TABLE IF EXISTS education_indicators CASCADE;
DROP TABLE IF EXISTS wards CASCADE;

-- Wards Baseline
CREATE TABLE wards (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    population INTEGER NOT NULL,
    equity_score DOUBLE PRECISION NOT NULL -- 0-10 scale (higher means more underserved)
);

-- Normalized Public Indicators per Ward
CREATE TABLE education_indicators (
    ward_id INTEGER PRIMARY KEY REFERENCES wards(id) ON DELETE CASCADE,
    school_capacity_ratio DOUBLE PRECISION NOT NULL, -- enrollment / limit (e.g. 1.2 = 120% capacity)
    avg_school_distance DOUBLE PRECISION NOT NULL -- km
);

CREATE TABLE road_indicators (
    ward_id INTEGER PRIMARY KEY REFERENCES wards(id) ON DELETE CASCADE,
    road_quality_index DOUBLE PRECISION NOT NULL, -- 1-10 (lower is worse)
    public_transit_dist DOUBLE PRECISION NOT NULL -- km
);

CREATE TABLE water_indicators (
    ward_id INTEGER PRIMARY KEY REFERENCES wards(id) ON DELETE CASCADE,
    water_scarcity_index DOUBLE PRECISION NOT NULL, -- 0-10 (higher is worse)
    supply_hours_daily DOUBLE PRECISION NOT NULL -- hours/day
);

CREATE TABLE health_indicators (
    ward_id INTEGER PRIMARY KEY REFERENCES wards(id) ON DELETE CASCADE,
    health_center_distance DOUBLE PRECISION NOT NULL, -- km
    beds_per_thousand DOUBLE PRECISION NOT NULL
);

-- Submissions (Multimodal Citizen Input)
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
    embedding vector(384), -- 384d vector for local all-MiniLM-L6-v2 model embeddings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Extracted Issues (NLP structured record)
CREATE TABLE extracted_issues (
    id SERIAL PRIMARY KEY,
    submission_id TEXT UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- education, roads, water, health, sanitation, skill
    issue_details TEXT NOT NULL,
    ward_id INTEGER REFERENCES wards(id) ON DELETE SET NULL,
    confidence_score DOUBLE PRECISION NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_review', -- pending_review, verified, rejected
    trust_score DOUBLE PRECISION NOT NULL, -- calculated based on evidence completeness
    is_campaign BOOLEAN DEFAULT FALSE
);

-- Demand Clusters (Grouped demands)
CREATE TABLE demand_clusters (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL,
    ward_id INTEGER REFERENCES wards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    citizen_count INTEGER DEFAULT 0,
    spam_count INTEGER DEFAULT 0,
    embedding vector(384), -- cluster centroid embedding
    status TEXT DEFAULT 'active'
);

-- Mappings between individual submissions and demand clusters
CREATE TABLE cluster_mappings (
    submission_id TEXT PRIMARY KEY REFERENCES submissions(id) ON DELETE CASCADE,
    cluster_id INTEGER REFERENCES demand_clusters(id) ON DELETE CASCADE
);

-- Structured Projects (MP decisions mapped to clusters)
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

-- Audit Decision Log
CREATE TABLE decision_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'Approved', 'Status Transition', 'Deferred', 'Tuned Weights'
    actor TEXT NOT NULL, -- 'MP', 'Staff'
    previous_state TEXT,
    new_state TEXT,
    reason TEXT
);
