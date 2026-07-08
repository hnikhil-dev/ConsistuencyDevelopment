-- Seed Wards
INSERT INTO wards (id, name, population, equity_score) VALUES
(1, 'Ward 1 - Koregaon Park Extension', 45000, 2.5),
(2, 'Ward 2 - Hadapsar Industrial Zone', 78000, 5.0),
(3, 'Ward 3 - Wanowrie Central', 92000, 6.5),
(4, 'Ward 4 - Kondhwa Khurd', 115000, 8.5),
(5, 'Ward 5 - Mundhwa Junction', 68000, 7.0);

-- Seed Education Indicators
INSERT INTO education_indicators (ward_id, school_capacity_ratio, avg_school_distance) VALUES
(1, 0.75, 1.2), -- 75% capacity, close by
(2, 0.95, 2.8),
(3, 1.35, 4.8), -- Overcrowded (135%), far
(4, 1.10, 3.5),
(5, 0.85, 2.2);

-- Seed Road Indicators
INSERT INTO road_indicators (ward_id, road_quality_index, public_transit_dist) VALUES
(1, 8.5, 0.5), -- Good roads, close transit
(2, 6.0, 1.5),
(3, 5.2, 1.8),
(4, 4.0, 2.5),
(5, 2.8, 3.2); -- Very poor roads (2.8/10)

-- Seed Water Indicators
INSERT INTO water_indicators (ward_id, water_scarcity_index, supply_hours_daily) VALUES
(1, 1.5, 24.0), -- Excellent water (1.5 scarcity, 24h supply)
(2, 4.5, 6.0),
(3, 5.0, 4.0),
(4, 8.8, 1.2), -- Severe scarcity (8.8 scarcity, 1.2h supply)
(5, 6.5, 3.0);

-- Seed Health Indicators
INSERT INTO health_indicators (ward_id, health_center_distance, beds_per_thousand) VALUES
(1, 0.8, 4.5),
(2, 2.5, 2.1),
(3, 3.2, 1.8),
(4, 5.5, 0.8), -- Far health center, low capacity
(5, 4.0, 1.2);

-- Seed Active Demand Clusters (Aggregated Citizen suggestions)
INSERT INTO demand_clusters (id, category, ward_id, title, summary, citizen_count, spam_count, embedding, status) VALUES
(1, 'water', 4, 'Ward 4 Clean Water Pipeline Upgrade', 'Consolidated demand for clean water supply network expansion in Kondhwa Khurd due to low pressure and contamination.', 38, 2, NULL, 'active'),
(2, 'roads', 5, 'Ward 5 Main Road Repair & Streetlighting', 'Multiple requests to resurface the main junction road and install streetlights to reduce night accidents.', 29, 0, NULL, 'active'),
(3, 'education', 3, 'Ward 3 Public School Classroom Expansion', 'High demand to build a new wing of classrooms at the Wanowrie Central School to handle massive student overflow.', 24, 1, NULL, 'active'),
(4, 'health', 4, 'Ward 4 Community Health Sub-Center', 'Requests for a localized health dispensary since the nearest hospital is over 5km away.', 15, 0, NULL, 'active'),
(5, 'skill', 2, 'Ward 2 Youth Vocational Training Center', 'Suggestions to set up a skill center near the industrial area to train local youths in assembly work.', 12, 12, NULL, 'active'),
(6, 'sanitation', 1, 'Ward 1 Public Sanitation Block', 'Requests to build modern, hygienic public toilets in the commercial extension area.', 19, 0, NULL, 'active'),
(7, 'water', 3, 'Ward 3 Drinking Water Pipeline Extension', 'Extension of clean drinking water mains to newly developed sub-localities in Wanowrie.', 11, 0, NULL, 'active'),
(8, 'roads', 2, 'Ward 2 Main Bypass Resurfacing', 'Complete re-tarring of the heavy vehicle bypass road in Hadapsar Industrial Zone to prevent accident hazards.', 22, 1, NULL, 'active'),
(9, 'sanitation', 5, 'Ward 5 Drainage Network Upgrade', 'Upgrading the storm water drainage channels in Mundhwa to prevent seasonal monsoon flooding.', 17, 2, NULL, 'active'),
(10, 'skill', 1, 'Ward 1 ITI Vocational Skill Center', 'Establishment of an Industrial Training Institute extension to offer welder and fitter trade certifications.', 8, 0, NULL, 'active');

-- Seed Projects derived from Clusters
INSERT INTO projects (id, cluster_id, title, category, ward_id, estimated_cost, status, citizen_rating) VALUES
(1, 1, 'Clean Water Pipeline Upgrade', 'water', 4, 350000, 'Proposed', NULL),
(2, 2, 'Main Road Repair & Streetlighting', 'roads', 5, 280000, 'Proposed', NULL),
(3, 3, 'Public School Classroom Expansion', 'education', 3, 420000, 'Proposed', NULL),
(4, 4, 'Community Health Sub-Center', 'health', 4, 600000, 'Proposed', NULL),
(5, 5, 'Youth Vocational Training Center', 'skill', 2, 450000, 'Proposed', NULL),
(6, 6, 'Public Sanitation Block Construction', 'sanitation', 1, 380000, 'Proposed', NULL),
(7, 7, 'Drinking Water Pipeline Extension', 'water', 3, 550000, 'Proposed', NULL),
(8, 8, 'Main Bypass Resurfacing Work', 'roads', 2, 920000, 'Proposed', NULL),
(9, 9, 'Drainage Network Upgrade & Desilting', 'sanitation', 5, 480000, 'Proposed', NULL),
(10, 10, 'ITI Vocational Skill Center Setup', 'skill', 1, 1200000, 'Proposed', NULL);
