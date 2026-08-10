BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- 1. UPDATE CAMERAS TABLE
-- ============================================================

ALTER TABLE cameras ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS road_name TEXT;
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS enforcement_type TEXT;
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS last_verified DATE;
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(4,3);

-- ============================================================
-- 2. SOURCE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS india_camera_sources (
    id SERIAL PRIMARY KEY,
    source_name TEXT NOT NULL,
    source_type TEXT,
    source_url TEXT,
    description TEXT,
    retrieved_on DATE DEFAULT CURRENT_DATE
);

-- ============================================================
-- 3. ROAD / DEPLOYMENT TABLE
--
-- IMPORTANT:
-- These records do NOT have exact GPS coordinates.
-- Therefore they are NOT inserted into cameras.
-- ============================================================

CREATE TABLE IF NOT EXISTS india_camera_deployments (
    id SERIAL PRIMARY KEY,
    country TEXT NOT NULL DEFAULT 'India',
    state TEXT,
    district TEXT,
    city TEXT,
    road_name TEXT,
    camera_type TEXT,
    enforcement_type TEXT,
    deployment_status TEXT DEFAULT 'reported',
    verification_status TEXT DEFAULT 'reported',
    confidence_score NUMERIC(4,3),
    source TEXT,
    source_url TEXT,
    last_verified DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. SOURCES
-- ============================================================

INSERT INTO india_camera_sources
(source_name, source_type, source_url, description)
SELECT
    'Delhi Traffic Police - RLVD and OSVD Cameras',
    'official',
    'https://staging.parivahan.gov.in/delhitrafficpolice/en/rlvd-and-osvd-cameras',
    'Official Delhi Traffic Police camera location source'
WHERE NOT EXISTS (
    SELECT 1
    FROM india_camera_sources
    WHERE source_name = 'Delhi Traffic Police - RLVD and OSVD Cameras'
);

INSERT INTO india_camera_sources
(source_name, source_type, source_url, description)
SELECT
    'Delhi Police - 125 OSVD Cameras',
    'official',
    'https://kpkb.delhipolice.gov.in/Readmore?id=2246',
    'Delhi Police OSVD camera announcement'
WHERE NOT EXISTS (
    SELECT 1
    FROM india_camera_sources
    WHERE source_name = 'Delhi Police - 125 OSVD Cameras'
);

INSERT INTO india_camera_sources
(source_name, source_type, source_url, description)
SELECT
    'MoRTH / PIB - Electronic Monitoring and Enforcement',
    'government',
    'https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=1747285',
    'National electronic enforcement framework'
WHERE NOT EXISTS (
    SELECT 1
    FROM india_camera_sources
    WHERE source_name = 'MoRTH / PIB - Electronic Monitoring and Enforcement'
);

INSERT INTO india_camera_sources
(source_name, source_type, source_url, description)
SELECT
    'MoRTH / PIB - Intelligent Traffic Management System',
    'government',
    'https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2115576',
    'National intelligent traffic management and enforcement'
WHERE NOT EXISTS (
    SELECT 1
    FROM india_camera_sources
    WHERE source_name = 'MoRTH / PIB - Intelligent Traffic Management System'
);

INSERT INTO india_camera_sources
(source_name, source_type, source_url, description)
SELECT
    'Ahmedabad TMICC',
    'government_project_document',
    'https://www.nitiforstates.gov.in/public-assets/Policy/policy_files/GNC518H000110.pdf',
    'Ahmedabad CSITMS / ANPR / RLVD deployment'
WHERE NOT EXISTS (
    SELECT 1
    FROM india_camera_sources
    WHERE source_name = 'Ahmedabad TMICC'
);

INSERT INTO india_camera_sources
(source_name, source_type, source_url, description)
SELECT
    'MoHUA Smart Cities - Visakhapatnam',
    'government_project_document',
    'https://mohua.gov.in/dataSmartCities/uploads/resource/resourceDoc/Resource_Doc_1723188972_Artificial_Intelligence_Use_Case_Compendium.pdf',
    'Visakhapatnam AI traffic monitoring deployment'
WHERE NOT EXISTS (
    SELECT 1
    FROM india_camera_sources
    WHERE source_name = 'MoHUA Smart Cities - Visakhapatnam'
);

-- ============================================================
-- 5. DELHI ROAD-LEVEL CAMERA DEPLOYMENTS
-- ============================================================

INSERT INTO india_camera_deployments
(
    state,
    district,
    city,
    road_name,
    camera_type,
    enforcement_type,
    deployment_status,
    verification_status,
    confidence_score,
    source,
    source_url,
    last_verified
)
SELECT
    'Delhi',
    'New Delhi',
    'New Delhi',
    v.road_name,
    'Speed Camera',
    'Overspeeding',
    'active',
    'reported',
    0.850,
    'Delhi Traffic Police',
    'https://staging.parivahan.gov.in/delhitrafficpolice/en/rlvd-and-osvd-cameras',
    CURRENT_DATE
FROM (
    VALUES
    ('NH-24 near Yamuna Bridge'),
    ('Outer Ring Road near Geeta Colony'),
    ('Outer Ring Road near Rajghat DTC Depot'),
    ('Ring Road near Burari Flyover'),
    ('Ring Road near Mukraba Chowk'),
    ('Ring Road near Wazirabad'),
    ('Dev Prakash Shastri Marg'),
    ('Ring Road near Cantt Metro Station'),
    ('Dwarka Link Road near Palam Flyover'),
    ('MG Road near Arjangarh'),
    ('Aruna Asif Ali Road near Neela Hauz'),
    ('Aruna Asif Ali Road near IIMC'),
    ('Nelson Mandela Road'),
    ('Barapula Flyover near Sewa Nagar'),
    ('IGI Road near Custom Office'),
    ('Noida Link Road Mayur Vihar Phase-1'),
    ('DND Road'),
    ('NH-1 Singhu Border'),
    ('NH-1 Siraspur Gurudwara'),
    ('NH-1 Punjabi Dhaba'),
    ('NH-10 Rohtak Road near Tikri Metro Station'),
    ('Near Sector-21 Dwarka Metro Station'),
    ('Road No. 208 Dwarka Lords Apartments'),
    ('Shankar Road to Talkatora Roundabout'),
    ('Akshardham Metro Station'),
    ('Josip Broz Tito Marg'),
    ('Mehrauli-Mahipalpur Road')
) AS v(road_name)
WHERE NOT EXISTS (
    SELECT 1
    FROM india_camera_deployments d
    WHERE d.city = 'New Delhi'
      AND d.road_name = v.road_name
);

-- ============================================================
-- 6. AHMEDABAD
-- ============================================================

INSERT INTO india_camera_deployments
(
    state,
    district,
    city,
    road_name,
    camera_type,
    enforcement_type,
    deployment_status,
    verification_status,
    confidence_score,
    source,
    source_url,
    last_verified
)
SELECT
    'Gujarat',
    'Ahmedabad',
    'Ahmedabad',
    'CSITMS strategic camera deployment',
    'ANPR Camera',
    'Automatic Number Plate Recognition',
    'active',
    'verified',
    0.950,
    'Ahmedabad TMICC',
    'https://www.nitiforstates.gov.in/public-assets/Policy/policy_files/GNC518H000110.pdf',
    CURRENT_DATE
WHERE NOT EXISTS (
    SELECT 1
    FROM india_camera_deployments
    WHERE city = 'Ahmedabad'
      AND camera_type = 'ANPR Camera'
);

INSERT INTO india_camera_deployments
(
    state,
    district,
    city,
    road_name,
    camera_type,
    enforcement_type,
    deployment_status,
    verification_status,
    confidence_score,
    source,
    source_url,
    last_verified
)
SELECT
    'Gujarat',
    'Ahmedabad',
    'Ahmedabad',
    'CSITMS strategic camera deployment',
    'Red Light Camera',
    'Red Light Violation Detection',
    'active',
    'verified',
    0.950,
    'Ahmedabad TMICC',
    'https://www.nitiforstates.gov.in/public-assets/Policy/policy_files/GNC518H000110.pdf',
    CURRENT_DATE
WHERE NOT EXISTS (
    SELECT 1
    FROM india_camera_deployments
    WHERE city = 'Ahmedabad'
      AND camera_type = 'Red Light Camera'
);

-- ============================================================
-- 7. VISAKHAPATNAM
-- ============================================================

INSERT INTO india_camera_deployments
(
    state,
    district,
    city,
    road_name,
    camera_type,
    enforcement_type,
    deployment_status,
    verification_status,
    confidence_score,
    source,
    source_url,
    last_verified
)
SELECT
    'Andhra Pradesh',
    'Visakhapatnam',
    'Visakhapatnam',
    'AI traffic monitoring - 10 junction deployment',
    'Red Light Camera',
    'Red Light Violation Detection',
    'active',
    'verified',
    0.950,
    'MoHUA Smart Cities',
    'https://mohua.gov.in/dataSmartCities/uploads/resource/resourceDoc/Resource_Doc_1723188972_Artificial_Intelligence_Use_Case_Compendium.pdf',
    CURRENT_DATE
WHERE NOT EXISTS (
    SELECT 1
    FROM india_camera_deployments
    WHERE city = 'Visakhapatnam'
      AND camera_type = 'Red Light Camera'
);

INSERT INTO india_camera_deployments
(
    state,
    district,
    city,
    road_name,
    camera_type,
    enforcement_type,
    deployment_status,
    verification_status,
    confidence_score,
    source,
    source_url,
    last_verified
)
SELECT
    'Andhra Pradesh',
    'Visakhapatnam',
    'Visakhapatnam',
    'AI traffic monitoring - 10 junction deployment',
    'ANPR Camera',
    'Automatic Number Plate Recognition',
    'active',
    'verified',
    0.950,
    'MoHUA Smart Cities',
    'https://mohua.gov.in/dataSmartCities/uploads/resource/resourceDoc/Resource_Doc_1723188972_Artificial_Intelligence_Use_Case_Compendium.pdf',
    CURRENT_DATE
WHERE NOT EXISTS (
    SELECT 1
    FROM india_camera_deployments
    WHERE city = 'Visakhapatnam'
      AND camera_type = 'ANPR Camera'
);

-- ============================================================
-- 8. NATIONAL ATMS DEPLOYMENTS
-- ============================================================

INSERT INTO india_camera_deployments
(
    state,
    city,
    road_name,
    camera_type,
    enforcement_type,
    deployment_status,
    verification_status,
    confidence_score,
    source,
    source_url,
    last_verified
)
SELECT
    v.state,
    v.city,
    v.road_name,
    'AI Traffic Enforcement Camera',
    'Advanced Traffic Management System',
    v.deployment_status,
    'verified',
    0.900,
    'Ministry of Road Transport and Highways',
    'https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2115576',
    CURRENT_DATE
FROM (
    VALUES
    ('Karnataka', 'Bengaluru', 'Bengaluru-Mysuru Augmentation Corridor', 'active'),
    ('Delhi', 'New Delhi', 'Dwarka Expressway', 'active'),
    ('Haryana', NULL, 'Dwarka Expressway', 'active'),
    ('Uttar Pradesh', NULL, 'Delhi-Agra Corridor', 'planned'),
    ('Uttar Pradesh', 'Lucknow', 'Lucknow Ring Road', 'planned'),
    ('Delhi', 'New Delhi', 'UER-II', 'planned'),
    ('Haryana', NULL, 'UER-II', 'planned')
) AS v(state, city, road_name, deployment_status)
WHERE NOT EXISTS (
    SELECT 1
    FROM india_camera_deployments d
    WHERE d.state = v.state
      AND d.road_name = v.road_name
      AND d.camera_type = 'AI Traffic Enforcement Camera'
);

-- ============================================================
-- 9. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_cameras_country
ON cameras(country);

CREATE INDEX IF NOT EXISTS idx_cameras_state
ON cameras(state);

CREATE INDEX IF NOT EXISTS idx_cameras_city
ON cameras(city);

CREATE INDEX IF NOT EXISTS idx_cameras_verification
ON cameras(verification_status);

CREATE INDEX IF NOT EXISTS idx_cameras_camera_type
ON cameras(camera_type);

CREATE INDEX IF NOT EXISTS idx_cameras_source
ON cameras(source);

CREATE INDEX IF NOT EXISTS idx_cameras_location
ON cameras
USING GIST(location);

CREATE INDEX IF NOT EXISTS idx_india_deployments_state
ON india_camera_deployments(state);

CREATE INDEX IF NOT EXISTS idx_india_deployments_city
ON india_camera_deployments(city);

CREATE INDEX IF NOT EXISTS idx_india_deployments_type
ON india_camera_deployments(camera_type);

-- ============================================================
-- 10. INDIA CAMERA VIEW
-- ============================================================

CREATE OR REPLACE VIEW india_cameras AS
SELECT
    id,
    country,
    state,
    district,
    city,
    road_name,
    camera_type,
    enforcement_type,
    latitude,
    longitude,
    status,
    verification_status,
    confidence_score,
    source,
    source_url,
    last_verified,
    created_at,
    updated_at
FROM cameras
WHERE country = 'India';

-- ============================================================
-- 11. SUMMARY
-- ============================================================

SELECT
    'India camera/deployment database updated successfully'
    AS message;

SELECT
    COUNT(*) AS actual_gps_cameras
FROM cameras
WHERE country = 'India'
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

SELECT
    COUNT(*) AS road_level_deployments
FROM india_camera_deployments;

COMMIT;
