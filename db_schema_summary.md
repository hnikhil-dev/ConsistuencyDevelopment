# 🏛️ Database Schema Directory: People's Priorities

This document outlines the PostgreSQL database structure for the Constituency Development and Intelligence Platform, detailing the relationship between raw citizen suggestions, structural ward statistics, AI classifications, and MP project decisions.

---

## 🗺️ Entity-Relationship Diagrams (ERD)

### 1. Citizen Intake & Regional Indicators
```text
                    +--------------------+
                    |       wards        |
                    +--------------------+
                    | id (PK)            |<-------------------+
                    | name               |                    |
                    | population         |                    |
                    | equity_score       |                    |
                    +--------------------+                    |
                              ^                               |
                              | (FK)                          |
           +------------------+------------------+            | (FK)
           |                  |                  |            |
+--------------------+ +-------------+ +--------------------+ |
|   road_indicators  | |  ...other   | |  extracted_issues  | |
+--------------------+ |  indicators | +--------------------+ |
| ward_id (PK, FK)   | +-------------+ | id (PK)            | |
| road_quality_index |                 | submission_id (FK) | |
| public_transit_dist|                 | category           | |
+--------------------+                 | issue_details      | |
                                       | ward_id (FK)       |-+
                                       | confidence_score   |
                                       | status             |
                                       | trust_score        |
                                       | is_campaign        |
                                       +--------------------+
                                                 |
                                                 | (FK)
                                                 v
                                       +--------------------+
                                       |    submissions     |
                                       +--------------------+
                                       | id (PK)            |
                                       | user_name          |
                                       | raw_text           |
                                       | audio_url          |
                                       | image_url          |
                                       | language, channel  |
                                       | gps_lat, gps_lng   |
                                       | embedding (vector) |
                                       | created_at         |
                                       +--------------------+
```

### 2. Clustered Demands, Projects & Audits
```text
  +------------------+
  |   submissions    |
  +------------------+
  | id (PK)          |<-----+
  +------------------+      | (FK)
                            |
                  +--------------------+
                  |  cluster_mappings  |
                  +--------------------+
                  | submission_id (FK) |
                  | cluster_id (FK)    |-----+
                  +--------------------+     |
                                             | (FK)
                                             v
                                  +--------------------+
                                  |  demand_clusters   |
                                  +--------------------+
                                  | id (PK)            |<-----+
                                  | category, ward_id  |      |
                                  | title, summary     |      |
                                  | citizen_count      |      |
                                  +--------------------+      | (FK)
                                                              |
                                                    +--------------------+
                                                    |      projects      |
                                                    +--------------------+
                                                    | id (PK)            |
                                                    | cluster_id (FK, U) |
                                                    | title, category    |
                                                    | ward_id, cost      |
                                                    | status             |
                                                    +--------------------+
                                                              |
                                                              | (FK)
                                                              v
                                                    +--------------------+
                                                    |   decision_logs    |
                                                    +--------------------+
                                                    | id (PK)            |
                                                    | project_id (FK)    |
                                                    | action, actor      |
                                                    | prev/new_state     |
                                                    | reason             |
                                                    +--------------------+
```

---

## 📋 Detailed Table Descriptions

### 1. `wards`
Holds the foundational census and equity profile for each administrative sector.
* `id` (INTEGER, Primary Key): Unique ID of the ward.
* `name` (TEXT): Name of the neighborhood.
* `population` (INTEGER): Total resident count.
* `equity_score` (DOUBLE PRECISION): 0 to 10 scale tracking how underserved the ward is (higher means more priority).

### 2. Ward Indicators (`road_indicators`, `water_indicators`, `health_indicators`, `education_indicators`)
Stores structural quality values per ward. Each table references `wards.id` as both a primary key and foreign key.
* `ward_id` (INTEGER, PK, FK -> `wards.id`): References the corresponding ward.
* Indicator fields (e.g. `road_quality_index`, `school_capacity_ratio`, `supply_hours_daily`).

### 3. `submissions`
Houses raw citizen messages, files, and location metrics.
* `id` (TEXT, Primary Key): Unique random string (e.g. `sub-178...`).
* `user_name` (TEXT): Full name of the submitter.
* `raw_text` (TEXT): Core suggestion transcription or description.
* `audio_url` (TEXT, Nullable): URL to the raw voice note uploaded to Supabase Storage.
* `image_url` (TEXT, Nullable): URL to the evidence image.
* `language` (TEXT): Detected language (Marathi, Hindi, English).
* `channel` (TEXT): Ingest portal type (Web Form, Voice Note, OCR Image).
* `gps_lat` / `gps_lng` (DOUBLE PRECISION, Nullable): GPS coordinates for verification.
* `embedding` (vector(384)): Text vector representation for semantic matching.
* `created_at` (TIMESTAMP): Creation date.

### 4. `extracted_issues`
Stores AI-structured insights parsed from citizen letters.
* `id` (SERIAL, Primary Key).
* `submission_id` (TEXT, FK -> `submissions.id`): Backlink to raw citizen info.
* `category` (TEXT): Assigned sector (water, roads, health, education, sanitation, skill).
* `issue_details` (TEXT): Refined issue summary.
* `ward_id` (INTEGER, FK -> `wards.id`): Mapped geographical target.
* `confidence_score` (DOUBLE PRECISION): Model output score (under 0.70 goes to manual verification queue).
* `status` (TEXT): Ingestion state (`pending_review`, `verified`, `rejected`).
* `trust_score` (DOUBLE PRECISION): Reliability calculated by location metadata and files checklist.
* `is_campaign` (BOOLEAN): De-duplicated flags.

### 5. `demand_clusters`
Aggregates individual citizen proposals into unified demand nodes.
* `id` (SERIAL, Primary Key).
* `category` / `ward_id` (FK -> `wards.id`).
* `title` / `summary` (TEXT): AI-generated title and text description of the combined requests.
* `citizen_count` (INTEGER): Total number of supporting citizen votes.
* `spam_count` (INTEGER): Mapped duplicate count.
* `status` (TEXT): Cluster state (`active`, `archived`).

### 6. `cluster_mappings`
Link table between individual submissions and the group demand cluster.
* `submission_id` (TEXT, PK, FK -> `submissions.id`): Submitter identifier.
* `cluster_id` (INTEGER, FK -> `demand_clusters.id`): Target cluster.

### 7. `projects`
MP-managed actions and budgets mapped directly to clusters.
* `id` (SERIAL, Primary Key).
* `cluster_id` (INTEGER, Unique, FK -> `demand_clusters.id`): Backlink to citizen demands.
* `title` / `category` / `ward_id` (FK -> `wards.id`).
* `estimated_cost` (INTEGER): Scaled financial value.
* `status` (TEXT): Lifecycle status (`Proposed`, `Approved`, `Tendering`, `Construction`, `Completed`).

### 8. `decision_logs`
Immutable audit logs for transparency.
* `id` (SERIAL, Primary Key).
* `timestamp` (TIMESTAMP).
* `project_id` (INTEGER, FK -> `projects.id`): Backlink to modified project.
* `action` (TEXT): Event description (e.g. `Status Transition`).
* `actor` (TEXT): Moderator (`MP`, `Staff`).
* `previous_state` / `new_state` (TEXT).
* `reason` (TEXT): Justification statement.
