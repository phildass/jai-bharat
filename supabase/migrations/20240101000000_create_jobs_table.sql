-- Migration: create jobs table
-- Enables full-text search (tsvector), indexes for common filters,
-- and a Haversine-based nearby function (PostGIS optional).

-- ---------------------------------------------------------------------------
-- Enable extensions (best-effort; may already exist in hosted Supabase)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- PostGIS is optional; the jobs_nearby RPC uses Haversine SQL as fallback
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS postgis;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'PostGIS not available, skipping.';
END;
$$;

-- ---------------------------------------------------------------------------
-- jobs table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jobs (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  title            TEXT          NOT NULL,
  organization     TEXT          NOT NULL,
  category         TEXT,
  state            TEXT,
  district         TEXT,
  city             TEXT,
  lat              DOUBLE PRECISION,
  lon              DOUBLE PRECISION,
  last_date        DATE,
  status           TEXT          NOT NULL DEFAULT 'active',
  -- 'active' | 'closed' | 'upcoming'
  vacancies        INTEGER,
  apply_url        TEXT,
  notification_url TEXT,
  description      TEXT,
  search_vector    TSVECTOR,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (title, organization)
);

-- ---------------------------------------------------------------------------
-- Indexes for filter & sort performance
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_jobs_state       ON jobs (state);
CREATE INDEX IF NOT EXISTS idx_jobs_district    ON jobs (district);
CREATE INDEX IF NOT EXISTS idx_jobs_category    ON jobs (category);
CREATE INDEX IF NOT EXISTS idx_jobs_status      ON jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_last_date   ON jobs (last_date);
CREATE INDEX IF NOT EXISTS idx_jobs_search      ON jobs USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_jobs_trgm_title  ON jobs USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jobs_lat_lon     ON jobs (lat, lon)
  WHERE lat IS NOT NULL AND lon IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Trigger: keep search_vector up-to-date
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION jobs_search_vector_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.organization, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.state, '')), 'D') ||
    setweight(to_tsvector('english', COALESCE(NEW.district, '')), 'D') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'D');
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_jobs_search_vector ON jobs;
CREATE TRIGGER trg_jobs_search_vector
  BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION jobs_search_vector_update();

-- ---------------------------------------------------------------------------
-- RPC: jobs_nearby (Haversine – works without PostGIS)
-- Returns jobs within p_radius_km kilometres, sorted by distance ASC.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION jobs_nearby(
  p_lat      DOUBLE PRECISION,
  p_lon      DOUBLE PRECISION,
  p_radius_km INTEGER DEFAULT 25,
  p_limit    INTEGER DEFAULT 50
)
RETURNS TABLE (
  id               UUID,
  title            TEXT,
  organization     TEXT,
  category         TEXT,
  state            TEXT,
  district         TEXT,
  city             TEXT,
  lat              DOUBLE PRECISION,
  lon              DOUBLE PRECISION,
  last_date        DATE,
  status           TEXT,
  vacancies        INTEGER,
  apply_url        TEXT,
  notification_url TEXT,
  description      TEXT,
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ,
  "distanceKm"     DOUBLE PRECISION
)
LANGUAGE sql STABLE AS $$
  SELECT
    j.id,
    j.title,
    j.organization,
    j.category,
    j.state,
    j.district,
    j.city,
    j.lat,
    j.lon,
    j.last_date,
    j.status,
    j.vacancies,
    j.apply_url,
    j.notification_url,
    j.description,
    j.created_at,
    j.updated_at,
    -- Haversine formula (result in km)
    (
      6371.0 * 2.0 * ASIN(
        SQRT(
          POWER(SIN(RADIANS(j.lat - p_lat) / 2.0), 2) +
          COS(RADIANS(p_lat)) * COS(RADIANS(j.lat)) *
          POWER(SIN(RADIANS(j.lon - p_lon) / 2.0), 2)
        )
      )
    ) AS "distanceKm"
  FROM jobs j
  WHERE
    j.lat IS NOT NULL
    AND j.lon IS NOT NULL
    AND (
      6371.0 * 2.0 * ASIN(
        SQRT(
          POWER(SIN(RADIANS(j.lat - p_lat) / 2.0), 2) +
          COS(RADIANS(p_lat)) * COS(RADIANS(j.lat)) *
          POWER(SIN(RADIANS(j.lon - p_lon) / 2.0), 2)
        )
      )
    ) <= p_radius_km
  ORDER BY "distanceKm" ASC
  LIMIT p_limit;
$$;
