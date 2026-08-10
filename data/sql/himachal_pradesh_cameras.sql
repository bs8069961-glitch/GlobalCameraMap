============================================================
-- GLOBAL CAMERA MAP
-- HIMACHAL PRADESH CAMERA MASTER IMPORT
-- ============================================================
--
-- Purpose:
--   Import/update the current Himachal Pradesh camera dataset.
--
-- Important:
--   These records are currently classified as pending unless
--   previously verified. They should not automatically be
--   represented as confirmed challan cameras.
--
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Ensure PostGIS is available
-- ------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS postgis;


-- ------------------------------------------------------------
-- HIMACHAL PRADESH CAMERA DATA
-- ------------------------------------------------------------

INSERT INTO cameras (
    city,
    district,
    state,
    road_name,
    latitude,
    longitude,
    location,
    camera_type,
    enforcement_type,
    verification_status,
    confidence_score,
    source,
    source_url,
    last_verified
)
VALUES

-- ============================================================
-- BILASPUR
-- ============================================================

(
    'Bilaspur',
    'Bilaspur',
    'Himachal Pradesh',
    'Tunnel No. 1 Kainchi Mod',
    31.390000,
    76.760000,
    ST_SetSRID(ST_MakePoint(76.760000, 31.390000), 4326)::geography,
    'Speed Camera',
    'Speed Enforcement',
    'pending',
    NULL,
    'Bilaspur Police / ITMS - Kiratpur-Nerchowk',
    NULL,
    '2026-08-08'
),

(
    'Bilaspur',
    'Bilaspur',
    'Himachal Pradesh',
    'Mandi Bharari Chowk',
    31.410000,
    76.790000,
    ST_SetSRID(ST_MakePoint(76.790000, 31.410000), 4326)::geography,
    'Speed Camera',
    'Speed Enforcement',
    'pending',
    NULL,
    'Bilaspur Police / ITMS - Kiratpur-Nerchowk',
    NULL,
    '2026-08-08'
),

(
    'Bilaspur',
    'Bilaspur',
    'Himachal Pradesh',
    'Auhar',
    31.387248,
    76.726913,
    ST_SetSRID(ST_MakePoint(76.726913, 31.387248), 4326)::geography,
    'Speed Camera',
    'Speed Enforcement',
    'pending',
    NULL,
    'Bilaspur Police / ITMS - Kiratpur-Nerchowk',
    NULL,
    '2026-08-08'
),

(
    'Bilaspur',
    'Bilaspur',
    'Himachal Pradesh',
    'Tunnel Char Tehra',
    31.400000,
    76.740000,
    ST_SetSRID(ST_MakePoint(76.740000, 31.400000), 4326)::geography,
    'Speed Camera',
    'Speed Enforcement',
    'pending',
    NULL,
    'Bilaspur Police / ITMS - Kiratpur-Nerchowk',
    NULL,
    '2026-08-08'
),

-- ============================================================
-- CHAMBA
-- ============================================================

(
    'Chamba',
    'Chamba',
    'Himachal Pradesh',
    'Tunnuhatti Police Barrier',
    32.540000,
    76.100000,
    ST_SetSRID(ST_MakePoint(76.100000, 32.540000), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    35.00,
    'Chamba Police / HP Police',
    'https://indiankanoon.org/doc/110238043/',
    NULL
),

-- ============================================================
-- HAMIRPUR
-- ============================================================

(
    'Hamirpur',
    'Hamirpur',
    'Himachal Pradesh',
    'Mini Secretariat / Hamirpur',
    31.686200,
    76.521300,
    ST_SetSRID(ST_MakePoint(76.521300, 31.686200), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    35.00,
    'Hamirpur District Administration / HP Police',
    'https://hphamirpur.nic.in/public-utility-category/police/',
    NULL
),

(
    'Hamirpur',
    'Hamirpur',
    'Himachal Pradesh',
    'Hamirpur Police Station / Tehsil Complex',
    31.686500,
    76.521800,
    ST_SetSRID(ST_MakePoint(76.521800, 31.686500), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    35.00,
    'Hamirpur District Administration / HP Police',
    'https://hphamirpur.nic.in/public-utility-category/police/',
    NULL
),

(
    'Hamirpur',
    'Hamirpur',
    'Himachal Pradesh',
    'Main Bazar Hamirpur',
    31.684800,
    76.523800,
    ST_SetSRID(ST_MakePoint(76.523800, 31.684800), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    30.00,
    'Hamirpur District Administration / HP Police',
    'https://hphamirpur.nic.in/public-utility-category/police/',
    NULL
),

(
    'Nadaun',
    'Hamirpur',
    'Himachal Pradesh',
    'Nadaun Town',
    31.652500,
    76.526000,
    ST_SetSRID(ST_MakePoint(76.526000, 31.652500), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    30.00,
    'Hamirpur District Administration / HP Police',
    'https://hphamirpur.nic.in/public-utility-category/police/',
    NULL
),

(
    'Barsar',
    'Hamirpur',
    'Himachal Pradesh',
    'Barsar Main Road',
    31.830000,
    76.530000,
    ST_SetSRID(ST_MakePoint(76.530000, 31.830000), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    30.00,
    'Hamirpur District Administration / HP Police',
    'https://hphamirpur.nic.in/public-utility-category/police/',
    NULL
),

(
    'Bhoranj',
    'Hamirpur',
    'Himachal Pradesh',
    'Bassi / Bhoranj',
    31.640000,
    76.580000,
    ST_SetSRID(ST_MakePoint(76.580000, 31.640000), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    30.00,
    'Hamirpur District Administration / HP Police',
    'https://hphamirpur.nic.in/public-utility-category/police/',
    NULL
),

(
    'Sujanpur',
    'Hamirpur',
    'Himachal Pradesh',
    'Sujanpur Main Road',
    31.715000,
    76.520000,
    ST_SetSRID(ST_MakePoint(76.520000, 31.715000), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    30.00,
    'Hamirpur District Administration / HP Police',
    'https://hphamirpur.nic.in/public-utility-category/police/',
    NULL
),

-- ============================================================
-- KANGRA
-- ============================================================

(
    'Dharamshala',
    'Kangra',
    'Himachal Pradesh',
    'SP Office',
    32.218000,
    76.320000,
    ST_SetSRID(ST_MakePoint(76.320000, 32.218000), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    60.00,
    'Dharamshala ITMS / HP Police',
    'https://informatics.nic.in/news/1308',
    '2026-08-08'
),

(
    'Dharamshala',
    'Kangra',
    'Himachal Pradesh',
    'Clock Tower',
    32.218000,
    76.320000,
    ST_SetSRID(ST_MakePoint(76.320000, 32.218000), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    60.00,
    'Dharamshala ITMS / HP Police',
    'https://informatics.nic.in/news/1308',
    '2026-08-08'
),

(
    'Dharamshala',
    'Kangra',
    'Himachal Pradesh',
    'Sakoh',
    32.187510,
    76.311950,
    ST_SetSRID(ST_MakePoint(76.311950, 32.187510), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    60.00,
    'Dharamshala ITMS / HP Police',
    'https://informatics.nic.in/news/1308',
    '2026-08-08'
),

(
    'Dharamshala',
    'Kangra',
    'Himachal Pradesh',
    'Sheela Chowk',
    32.197210,
    76.344160,
    ST_SetSRID(ST_MakePoint(76.344160, 32.197210), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    60.00,
    'Dharamshala ITMS / HP Police',
    'https://informatics.nic.in/news/1308',
    '2026-08-08'
),

(
    'Dharamshala',
    'Kangra',
    'Himachal Pradesh',
    'HRTC Workshop',
    32.218000,
    76.320000,
    ST_SetSRID(ST_MakePoint(76.320000, 32.218000), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    60.00,
    'Dharamshala ITMS / HP Police',
    'https://informatics.nic.in/news/1308',
    '2026-08-08'
),

(
    'Dharamshala',
    'Kangra',
    'Himachal Pradesh',
    'Chilgari Road',
    32.200000,
    76.320000,
    ST_SetSRID(ST_MakePoint(76.320000, 32.200000), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    60.00,
    'Dharamshala ITMS / HP Police',
    'https://informatics.nic.in/news/1308',
    '2026-08-08'
),

(
    'Dharamshala',
    'Kangra',
    'Himachal Pradesh',
    'War Memorial',
    32.199050,
    76.319720,
    ST_SetSRID(ST_MakePoint(76.319720, 32.199050), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    60.00,
    'Dharamshala ITMS / HP Police',
    'https://informatics.nic.in/news/1308',
    '2026-08-08'
),

-- ============================================================
-- KINNAUR
-- ============================================================

(
    'Reckong Peo',
    'Kinnaur',
    'Himachal Pradesh',
    'Near District Police Headquarters / Bus Stand',
    31.536000,
    78.271000,
    ST_SetSRID(ST_MakePoint(78.271000, 31.536000), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    40.00,
    'Kinnaur Police / District Administration',
    'https://hpkinnaur.nic.in/police-department-distt-kinnaur/',
    NULL
),

(
    'Tapri',
    'Kinnaur',
    'Himachal Pradesh',
    'NH-05 / Tapri',
    31.570000,
    78.200000,
    ST_SetSRID(ST_MakePoint(78.200000, 31.570000), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    40.00,
    'Kinnaur Police / District Administration',
    'https://hpkinnaur.nic.in/police-department-distt-kinnaur/',
    NULL
),

(
    'Nichar',
    'Kinnaur',
    'Himachal Pradesh',
    'NH-05 / Nichar',
    31.600000,
    78.030000,
    ST_SetSRID(ST_MakePoint(78.030000, 31.600000), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    35.00,
    'Kinnaur Police / District Administration',
    'https://hpkinnaur.nic.in/police-department-distt-kinnaur/',
    NULL
),

(
    'Sangla',
    'Kinnaur',
    'Himachal Pradesh',
    'Sangla Road',
    31.440000,
    78.270000,
    ST_SetSRID(ST_MakePoint(78.270000, 31.440000), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    30.00,
    'Kinnaur Police / District Administration',
    'https://hpkinnaur.nic.in/police-department-distt-kinnaur/',
    NULL
),

(
    'Karcham',
    'Kinnaur',
    'Himachal Pradesh',
    'Karcham Junction / NH-05',
    31.470000,
    78.250000,
    ST_SetSRID(ST_MakePoint(78.250000, 31.470000), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    35.00,
    'Kinnaur Police / District Administration',
    'https://hpkinnaur.nic.in/police-department-distt-kinnaur/',
    NULL
),

(
    'Pooh',
    'Kinnaur',
    'Himachal Pradesh',
    'NH-05 / Pooh',
    31.860000,
    78.430000,
    ST_SetSRID(ST_MakePoint(78.430000, 31.860000), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    35.00,
    'Kinnaur Police / District Administration',
    'https://hpkinnaur.nic.in/police-department-distt-kinnaur/',
    NULL
),

(
    'Chango',
    'Kinnaur',
    'Himachal Pradesh',
    'Chango Police Check Post',
    31.970000,
    78.600000,
    ST_SetSRID(ST_MakePoint(78.600000, 31.970000), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    35.00,
    'Kinnaur Police / District Administration',
    'https://hpkinnaur.nic.in/police-department-distt-kinnaur/',
    NULL
),

(
    'Namgia',
    'Kinnaur',
    'Himachal Pradesh',
    'Namgia Police Check Post',
    31.930000,
    78.570000,
    ST_SetSRID(ST_MakePoint(78.570000, 31.930000), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    35.00,
    'Kinnaur Police / District Administration',
    'https://hpkinnaur.nic.in/police-department-distt-kinnaur/',
    NULL
),

-- ============================================================
-- KULLU
-- ============================================================

(
    'Kullu',
    'Kullu',
    'Himachal Pradesh',
    'Kullu Town',
    31.957900,
    77.108900,
    ST_SetSRID(ST_MakePoint(77.108900, 31.957900), 4326)::geography,
    'Speed Camera',
    'Speed Enforcement',
    'pending',
    NULL,
    'Kullu Police ITMS',
    NULL,
    '2026-08-08'
),

(
    'Manali',
    'Kullu',
    'Himachal Pradesh',
    'Manali Town',
    32.243200,
    77.189200,
    ST_SetSRID(ST_MakePoint(77.189200, 32.243200), 4326)::geography,
    'Speed Camera',
    'Speed Enforcement',
    'pending',
    NULL,
    'Kullu Police ITMS',
    NULL,
    '2026-08-08'
),

(
    'Kullu',
    'Kullu',
    'Himachal Pradesh',
    'Patlikuhal',
    32.117680,
    77.147280,
    ST_SetSRID(ST_MakePoint(77.147280, 32.117680), 4326)::geography,
    'Speed Camera',
    'Speed Enforcement',
    'pending',
    NULL,
    'Kullu Police ITMS',
    NULL,
    '2026-08-08'
),

(
    'Kullu',
    'Kullu',
    'Himachal Pradesh',
    'Bhuntar-1',
    31.876000,
    77.154000,
    ST_SetSRID(ST_MakePoint(77.154000, 31.876000), 4326)::geography,
    'Speed Camera',
    'Speed Enforcement',
    'pending',
    NULL,
    'Kullu Police ITMS',
    NULL,
    '2026-08-08'
),

(
    'Kullu',
    'Kullu',
    'Himachal Pradesh',
    'Bhuntar-2',
    31.876500,
    77.154500,
    ST_SetSRID(ST_MakePoint(77.154500, 31.876500), 4326)::geography,
    'Speed Camera',
    'Speed Enforcement',
    'pending',
    NULL,
    'Kullu Police ITMS',
    NULL,
    '2026-08-08'
),

-- ============================================================
-- LAHAUL & SPITI
-- ============================================================

(
    'Keylong',
    'Lahaul & Spiti',
    'Himachal Pradesh',
    'Keylong Town / Manali-Leh Highway',
    32.571510,
    77.028790,
    ST_SetSRID(ST_MakePoint(77.028790, 32.571510), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    55.00,
    'Lahaul & Spiti Police / Animesh Netram',
    NULL,
    NULL
),

(
    'Tandi',
    'Lahaul & Spiti',
    'Himachal Pradesh',
    'Tandi / Keylong-Manali Road',
    32.556090,
    76.974710,
    ST_SetSRID(ST_MakePoint(76.974710, 32.556090), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    45.00,
    'Lahaul & Spiti Police / Animesh Netram',
    NULL,
    NULL
),

(
    'Kaza',
    'Lahaul & Spiti',
    'Himachal Pradesh',
    'Kaza Town / NH-505',
    32.224400,
    78.072300,
    ST_SetSRID(ST_MakePoint(78.072300, 32.224400), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    60.00,
    'Lahaul & Spiti Police / Animesh Netram',
    NULL,
    NULL
),

(
    'Sumdo',
    'Lahaul & Spiti',
    'Himachal Pradesh',
    'Sumdo Border / NH-505',
    32.068770,
    78.601550,
    ST_SetSRID(ST_MakePoint(78.601550, 32.068770), 4326)::geography,
    'ANPR Camera',
    'ANPR / Number Plate Enforcement',
    'pending',
    70.00,
    'Lahaul & Spiti Police / Animesh Netram',
    NULL,
    NULL
),

(
    'Sarchu',
    'Lahaul & Spiti',
    'Himachal Pradesh',
    'Leh-Manali Highway / Sarchu',
    32.906800,
    77.582710,
    ST_SetSRID(ST_MakePoint(77.582710, 32.906800), 4326)::geography,
    'ANPR Camera',
    'ANPR / Number Plate Enforcement',
    'pending',
    70.00,
    'Lahaul & Spiti Police / Animesh Netram',
    NULL,
    NULL
),

(
    'Shinku-La',
    'Lahaul & Spiti',
    'Himachal Pradesh',
    'Darcha-Shinku-La Road',
    32.908860,
    77.199980,
    ST_SetSRID(ST_MakePoint(77.199980, 32.908860), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    65.00,
    'Lahaul & Spiti Police / Animesh Netram',
    NULL,
    NULL
),

-- ============================================================
-- MANDI
-- ============================================================

(
    'Mandi',
    'Mandi',
    'Himachal Pradesh',
    'Bindravani - Chandigarh Manali Highway',
    31.676500,
    76.921500,
    ST_SetSRID(ST_MakePoint(76.921500, 31.676500), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    55.00,
    'Mandi Police / ITMS',
    'https://himachalpr.gov.in/OnePressRelease.aspx?ID=27189&Language=1',
    NULL
),

-- ============================================================
-- SHIMLA
-- ============================================================

(
    'Shimla',
    'Shimla',
    'Himachal Pradesh',
    'Mall Road',
    31.104800,
    77.173400,
    ST_SetSRID(ST_MakePoint(77.173400, 31.104800), 4326)::geography,
    'Red Light Camera',
    'Red Light Enforcement',
    'verified',
    50.00,
    'Manual Record - Requires Verification',
    NULL,
    NULL
),

(
    'Shimla',
    'Shimla',
    'Himachal Pradesh',
    'Mall Road',
    31.104800,
    77.173400,
    ST_SetSRID(ST_MakePoint(77.173400, 31.104800), 4326)::geography,
    'Speed Camera',
    'Speed Enforcement',
    'verified',
    70.00,
    'Shimla Traffic Police - Speed Enforcement',
    NULL,
    '2026-08-08'
),

-- ============================================================
-- SIRMAUR
-- ============================================================

(
    'Kala Amb',
    'Sirmaur',
    'Himachal Pradesh',
    'Kala Amb Inter-State Checkpoint',
    30.441000,
    77.275000,
    ST_SetSRID(ST_MakePoint(77.275000, 30.441000), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    50.00,
    'HP Road Transport Department / ITMS',
    'https://www.tribuneindia.com/news/himachal/inter-state-checkpoint-in-kala-amb-gets-itmp/',
    NULL
),

(
    'Nahan',
    'Sirmaur',
    'Himachal Pradesh',
    'Shambhu Wala',
    30.750000,
    77.040000,
    ST_SetSRID(ST_MakePoint(77.040000, 30.750000), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    45.00,
    'Sirmaur Police / ITMS',
    'https://www.tribuneindia.com/news/himachal/four-new-locations-in-sirmaur-dist-now-under-surveillance-for-traffic-violations/',
    NULL
),

(
    'Nahan',
    'Sirmaur',
    'Himachal Pradesh',
    'Near Degree College Nahan',
    30.765000,
    77.040000,
    ST_SetSRID(ST_MakePoint(77.040000, 30.765000), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    45.00,
    'Sirmaur Police / ITMS',
    'https://www.tribuneindia.com/news/himachal/four-new-locations-in-sirmaur-dist-now-under-surveillance-for-traffic-violations/',
    NULL
),

(
    'Rajban',
    'Sirmaur',
    'Himachal Pradesh',
    'Rajban',
    30.680000,
    77.510000,
    ST_SetSRID(ST_MakePoint(77.510000, 30.680000), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    45.00,
    'Sirmaur Police / ITMS',
    'https://www.tribuneindia.com/news/himachal/four-new-locations-in-sirmaur-dist-now-under-surveillance-for-traffic-violations/',
    NULL
),

(
    'Sarahan',
    'Sirmaur',
    'Himachal Pradesh',
    'Sarahan Bus Stand',
    30.850000,
    77.250000,
    ST_SetSRID(ST_MakePoint(77.250000, 30.850000), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    45.00,
    'Sirmaur Police / ITMS',
    'https://www.tribuneindia.com/news/himachal/four-new-locations-in-sirmaur-dist-now-under-surveillance-for-traffic-violations/',
    NULL
),

-- ============================================================
-- SOLAN
-- ============================================================

(
    'Baddi',
    'Solan',
    'Himachal Pradesh',
    'Baddi-Barotiwala-Nalagarh Industrial Area',
    30.957800,
    76.791400,
    ST_SetSRID(ST_MakePoint(76.791400, 30.957800), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    45.00,
    'Baddi Police / BBN ITMS',
    'https://roadsafety.hp.gov.in/storage/files/5/state%20meeting/5th%20meeting%2006.01.21/Agenda%20-%2006.01.21-converted.pdf',
    NULL
),

-- ============================================================
-- UNA
-- ============================================================

(
    'Una',
    'Una',
    'Himachal Pradesh',
    'Mubarakpur Chowk, Amb',
    31.715000,
    76.530000,
    ST_SetSRID(ST_MakePoint(76.530000, 31.715000), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    45.00,
    'HP Road Safety / Himachal Pradesh Police',
    'https://roadsafety.hp.gov.in/',
    NULL
),

(
    'Una',
    'Una',
    'Himachal Pradesh',
    'Main Bus Stand Chowk, Mehatpur',
    31.687000,
    76.525000,
    ST_SetSRID(ST_MakePoint(76.525000, 31.687000), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    45.00,
    'HP Road Safety / Himachal Pradesh Police',
    'https://roadsafety.hp.gov.in/',
    NULL
),

(
    'Una',
    'Una',
    'Himachal Pradesh',
    'Daulatpur Chowk',
    31.825000,
    76.000000,
    ST_SetSRID(ST_MakePoint(76.000000, 31.825000), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    45.00,
    'HP Road Safety / Himachal Pradesh Police',
    'https://roadsafety.hp.gov.in/',
    NULL
),

(
    'Una',
    'Una',
    'Himachal Pradesh',
    'Marwari Barrier',
    31.470000,
    76.280000,
    ST_SetSRID(ST_MakePoint(76.280000, 31.470000), 4326)::geography,
    'Traffic Camera',
    'Traffic Enforcement',
    'pending',
    45.00,
    'HP Road Safety / Himachal Pradesh Police',
    'https://roadsafety.hp.gov.in/',
    NULL
);

COMMIT;

-- ============================================================
-- VERIFY IMPORT
-- ============================================================

SELECT
    COUNT(*) AS himachal_camera_count
FROM cameras
WHERE state = 'Himachal Pradesh';

SELECT
    district,
    COUNT(*) AS camera_count
FROM cameras
WHERE state = 'Himachal Pradesh'
GROUP BY district
ORDER BY district;