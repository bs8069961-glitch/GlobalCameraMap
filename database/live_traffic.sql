--============================================================ 
-- Global Camera Map
-- Live Traffic Seed / Refresh Data
-- ============================================================
--
-- Purpose:
--   Seed traffic segment data into the traffic_segments table.
--
-- Features:
--   - PostGIS LineString geometry
--   - Safe to run repeatedly
--   - Prevents duplicate traffic segments
--   - Updates existing records when source/source_id matches
--   - Compatible with PostgreSQL + PostGIS
--
-- Database:
--   global_camera
--
-- Table:
--   traffic_segments
--
-- ============================================================


-- ============================================================
-- 1. Ensure unique traffic source identity
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS
    uq_traffic_segments_source_source_id
ON traffic_segments (source, source_id);


-- ============================================================
-- 2. Insert / update traffic segments
-- ============================================================

INSERT INTO traffic_segments
(
    road_name,
    start_latitude,
    start_longitude,
    end_latitude,
    end_longitude,
    geometry,
    current_speed,
    free_flow_speed,
    delay_seconds,
    congestion_level,
    traffic_status,
    source,
    source_id,
    observed_at,
    updated_at
)
VALUES

-- ============================================================
-- NH 5
-- High congestion
-- ============================================================

(
    'NH 5',

    32.2190,
    76.3234,

    32.2205,
    76.3260,

    ST_SetSRID(
        ST_MakeLine(
            ST_MakePoint(76.3234, 32.2190),
            ST_MakePoint(76.3260, 32.2205)
        ),
        4326
    ),

    18,
    50,
    95,

    'high',
    'congested',

    'test',
    'test-nh5-001',

    NOW(),
    NOW()
),


-- ============================================================
-- MDR 45
-- Moderate congestion
-- ============================================================

(
    'MDR 45',

    32.2150,
    76.3180,

    32.2175,
    76.3205,

    ST_SetSRID(
        ST_MakeLine(
            ST_MakePoint(76.3180, 32.2150),
            ST_MakePoint(76.3205, 32.2175)
        ),
        4326
    ),

    32,
    45,
    35,

    'moderate',
    'slow',

    'test',
    'test-mdr45-001',

    NOW(),
    NOW()
),


-- ============================================================
-- Temple Road
-- Low congestion / free flow
-- ============================================================

(
    'Temple Road',

    32.2420,
    76.3210,

    32.2445,
    76.3240,

    ST_SetSRID(
        ST_MakeLine(
            ST_MakePoint(76.3210, 32.2420),
            ST_MakePoint(76.3240, 32.2445)
        ),
        4326
    ),

    45,
    45,
    0,

    'low',
    'free_flow',

    'test',
    'test-temple-001',

    NOW(),
    NOW()
)


-- ============================================================
-- 3. Update existing records instead of creating duplicates
-- ============================================================

ON CONFLICT (source, source_id)
DO UPDATE SET

    road_name =
        EXCLUDED.road_name,

    start_latitude =
        EXCLUDED.start_latitude,

    start_longitude =
        EXCLUDED.start_longitude,

    end_latitude =
        EXCLUDED.end_latitude,

    end_longitude =
        EXCLUDED.end_longitude,

    geometry =
        EXCLUDED.geometry,

    current_speed =
        EXCLUDED.current_speed,

    free_flow_speed =
        EXCLUDED.free_flow_speed,

    delay_seconds =
        EXCLUDED.delay_seconds,

    congestion_level =
        EXCLUDED.congestion_level,

    traffic_status =
        EXCLUDED.traffic_status,

    observed_at =
        EXCLUDED.observed_at,

    updated_at =
        NOW();


-- ============================================================
-- 4. Verification
-- ============================================================

SELECT
    id,
    road_name,
    start_latitude,
    start_longitude,
    end_latitude,
    end_longitude,
    current_speed,
    free_flow_speed,
    delay_seconds,
    congestion_level,
    traffic_status,
    source,
    source_id,
    ST_AsText(geometry) AS geometry
FROM traffic_segments
WHERE source = 'test'
  AND source_id IN
  (
      'test-nh5-001',
      'test-mdr45-001',
      'test-temple-001'
  )
ORDER BY id;