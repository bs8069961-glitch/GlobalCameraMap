BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE cameras ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS road_name TEXT;
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS enforcement_type TEXT;
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS last_verified DATE;
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(4,3);

CREATE TABLE IF NOT EXISTS india_camera_sources (
    id SERIAL PRIMARY KEY,
    source_name TEXT NOT NULL,
    source_type TEXT,
    source_url TEXT,
    description TEXT,
    retrieved_on DATE DEFAULT CURRENT_DATE
);

INSERT INTO india_camera_sources
(source_name, source_type, source_url, description)
SELECT
    'Delhi Traffic Police - RLVD and OSVD Cameras',
    'official',
    'https://staging.parivahan.gov.in/delhitrafficpolice/en/rlvd-and-osvd-cameras',
    'Official Delhi Traffic Police list of RLVD and OSVD camera locations'
WHERE NOT EXISTS (
    SELECT 1 FROM india_camera_sources
    WHERE source_name = 'Delhi Traffic Police - RLVD and OSVD Cameras'
);

INSERT INTO india_camera_sources
(source_name, source_type, source_url, description)
SELECT
    'Delhi Police - 125 OSVD Cameras',
    'official',
    'https://kpkb.delhipolice.gov.in/Readmore?id=2246',
    'Delhi Police announcement regarding additional OSVD cameras'
WHERE NOT EXISTS (
    SELECT 1 FROM india_camera_sources
    WHERE source_name = 'Delhi Police - 125 OSVD Cameras'
);

INSERT INTO india_camera_sources
(source_name, source_type, source_url, description)
SELECT
    'MoRTH / PIB - Electronic Monitoring and Enforcement',
    'government',
    'https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=1747285',
    'National rules covering electronic enforcement devices'
WHERE NOT EXISTS (
    SELECT 1 FROM india_camera_sources
    WHERE source_name = 'MoRTH / PIB - Electronic Monitoring and Enforcement'
);

INSERT INTO india_camera_sources
(source_name, source_type, source_url, description)
SELECT
    'MoRTH / PIB - Intelligent Traffic Management System',
    'government',
    'https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2115576',
    'National intelligent traffic management and electronic enforcement'
WHERE NOT EXISTS (
    SELECT 1 FROM india_camera_sources
    WHERE source_name = 'MoRTH / PIB - Intelligent Traffic Management System'
);

INSERT INTO india_camera_sources
(source_name, source_type, source_url, description)
SELECT
    'Ahmedabad TMICC',
    'government_project_document',
    'https://www.nitiforstates.gov.in/public-assets/Policy/policy_files/GNC518H000110.pdf',
    'Ahmedabad CSITMS / ANPR / RLVD deployment documentation'
WHERE NOT EXISTS (
    SELECT 1 FROM india_camera_sources
    WHERE source_name = 'Ahmedabad TMICC'
);

INSERT INTO india_camera_sources
(source_name, source_type, source_url, description)
SELECT
    'MoHUA Smart Cities - Visakhapatnam',
    'government_project_document',
    'https://mohua.gov.in/dataSmartCities/uploads/resource/resourceDoc/Resource_Doc_1723188972_Artificial_Intelligence_Use_Case_Compendium.pdf',
    'Visakhapatnam AI traffic monitoring and RLVD/ANPR deployment'
WHERE NOT EXISTS (
    SELECT 1 FROM india_camera_sources
    WHERE source_name = 'MoHUA Smart Cities - Visakhapatnam'
);

INSERT INTO cameras
(
    country,
    state,
    district,
    city,
    road_name,
    camera_type,
    enforcement_type,
    latitude,
    longitude,
    location,
    status,
    verification_status,
    confidence_score,
    source,
    source_url,
    last_verified
)
SELECT
    'India',
    'Delhi',
    'New Delhi',
    'New Delhi',
    v.road_name,
    'Speed Camera',
    'Overspeeding',
    NULL,
    NULL,
    NULL,
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
    FROM cameras c
    WHERE c.country = 'India'
      AND c.city = 'New Delhi'
      AND LOWER(TRIM(c.road_name)) = LOWER(TRIM(v.road_name))
      AND c.camera_type = 'Speed Camera'
);

INSERT INTO cameras
(
    country,
    state,
    district,
    city,
    road_name,
    camera_type,
    enforcement_type,
    latitude,
    longitude,
    location,
    status,
    verification_status,
    confidence_score,
    source,
    source_url,
    last_verified
)
SELECT
    'India',
    'Gujarat',
    'Ahmedabad',
    'Ahmedabad',
    'CSITMS strategic camera deployment',
    'ANPR Camera',
    'Automatic Number Plate Recognition',
    NULL,
    NULL,
    NULL,
    'active',
    'verified',
    0.950,
    'Ahmedabad TMICC',
    'https://www.nitiforstates.gov.in/public-assets/Policy/policy_files/GNC518H000110.pdf',
    CURRENT_DATE
WHERE NOT EXISTS (
    SELECT 1
    FROM cameras
    WHERE country = 'India'
      AND city = 'Ahmedabad'
      AND camera_type = 'ANPR Camera'
      AND road_name = 'CSITMS strategic camera deployment'
);

INSERT INTO cameras
(
    country,
    state,
    district,
    city,
    road_name,
    camera_type,
    enforcement_type,
    latitude,
    longitude,
    location,
    status,
    verification_status,
    confidence_score,
    source,
    source_url,
    last_verified
)
SELECT
    'India',
    'Gujarat',
    'Ahmedabad',
    'Ahmedabad',
    'CSITMS strategic camera deployment',
    'Red Light Camera',
    'Red Light Violation Detection',
    NULL,
    NULL,
    NULL,
    'active',
    'verified',
    0.950,
    'Ahmedabad TMICC',
    'https://www.nitiforstates.gov.in/public-assets/Policy/policy_files/GNC518H000110.pdf',
    CURRENT_DATE
WHERE NOT EXISTS (
    SELECT 1
    FROM cameras
    WHERE country = 'India'
      AND city = 'Ahmedabad'
      AND camera_type = 'Red Light Camera'
      AND road_name = 'CSITMS strategic camera deployment'
);

INSERT INTO cameras
(
    country,
    state,
    district,
    city,
    road_name,
    camera_type,
    enforcement_type,
    latitude,
    longitude,
    location,
    status,
    verification_status,
    confidence_score,
    source,
    source_url,
    last_verified
)
SELECT
    'India',
    'Andhra Pradesh',
    'Visakhapatnam',
    'Visakhapatnam',
    'AI traffic monitoring - 10 junction deployment',
    'Red Light Camera',
    'Red Light Violation Detection',
    NULL,
    NULL,
    NULL,
    'active',
    'verified',
    0.950,
    'MoHUA Smart Cities',
    'https://mohua.gov.in/dataSmartCities/uploads/resource/resourceDoc/Resource_Doc_1723188972_Artificial_Intelligence_Use_Case_Compendium.pdf',
    CURRENT_DATE
WHERE NOT EXISTS (
    SELECT 1
    FROM cameras
    WHERE country = 'India'
      AND city = 'Visakhapatnam'
      AND camera_type = 'Red Light Camera'
      AND road_name = 'AI traffic monitoring - 10 junction deployment'
);

INSERT INTO cameras
(
    country,
    state,
    district,
    city,
    road_name,
    camera_type,
    enforcement_type,
    latitude,
    longitude,
    location,
    status,
    verification_status,
    confidence_score,
    source,
    source_url,
    last_verified
)
SELECT
    'India',
    'Andhra Pradesh',
    'Visakhapatnam',
    'Visakhapatnam',
    'AI traffic monitoring - 10 junction deployment',
    'ANPR Camera',
    'Automatic Number Plate Recognition',
    NULL,
    NULL,
    NULL,
    'active',
    'verified',
    0.950,
    'MoHUA Smart Cities',
    'https://mohua.gov.in/dataSmartCities/uploads/resource/resourceDoc/Resource_Doc_1723188972_Artificial_Intelligence_Use_Case_Compendium.pdf',
    CURRENT_DATE
WHERE NOT EXISTS (
    SELECT 1
    FROM cameras
    WHERE country = 'India'
      AND city = 'Visakhapatnam'
      AND camera_type = 'ANPR Camera'
      AND road_name = 'AI traffic monitoring - 10 junction deployment'
);

INSERT INTO cameras
(
    country,
    state,
    district,
    city,
    road_name,
    camera_type,
    enforcement_type,
    latitude,
    longitude,
    location,
    status,
    verification_status,
    confidence_score,
    source,
    source_url,
    last_verified
)
SELECT
    'India',
    v.state,
    NULL,
    NULL,
    v.corridor,
    v.camera_type,
    'Advanced Traffic Management System',
    NULL,
    NULL,
    NULL,
    v.status,
    'verified',
    0.900,
    'Ministry of Road Transport and Highways',
    'https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2115576',
    CURRENT_DATE
FROM (
    VALUES
    ('Karnataka', 'Bengaluru-Mysuru Augmentation Corridor', 'AI Traffic Enforcement Camera', 'active'),
    ('Delhi', 'Dwarka Expressway', 'AI Traffic Enforcement Camera', 'active'),
    ('Haryana', 'Dwarka Expressway', 'AI Traffic Enforcement Camera', 'active'),
    ('Uttar Pradesh', 'Delhi-Agra Corridor', 'AI Traffic Enforcement Camera', 'planned'),
    ('Uttar Pradesh', 'Lucknow Ring Road', 'AI Traffic Enforcement Camera', 'planned'),
    ('Delhi', 'UER-II', 'AI Traffic Enforcement Camera', 'planned'),
    ('Haryana', 'UER-II', 'AI Traffic Enforcement Camera', 'planned')
) AS v(state, corridor, camera_type, status)
WHERE NOT EXISTS (
    SELECT 1
    FROM cameras c
    WHERE c.country = 'India'
      AND c.state = v.state
      AND c.road_name = v.corridor
      AND c.camera_type = v.camera_type
);

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
ON cameras USING GIST(location);

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

SELECT 'India camera database updated successfully' AS message;

SELECT COUNT(*) AS total_india_records
FROM cameras
WHERE country = 'India';

SELECT
    state,
    COUNT(*) AS camera_records
FROM cameras
WHERE country = 'India'
GROUP BY state
ORDER BY state;

SELECT
    camera_type,
    COUNT(*) AS total
FROM cameras
WHERE country = 'India'
GROUP BY camera_type
ORDER BY total DESC;

SELECT
    verification_status,
    COUNT(*) AS total
FROM cameras
WHERE country = 'India'
GROUP BY verification_status
ORDER BY verification_status;

COMMIT;
