-- ============================================================
-- Migration 001: Government Jobs Table
-- ============================================================

-- Enable pg_trgm for fuzzy search (optional, ignored if not permitted)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- -------------------------------------------------------
-- Table: jobs
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS jobs (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT         NOT NULL,
  organization     TEXT,
  board            TEXT,        -- UPSC / SSC / RRB / State PSC / etc.
  category         TEXT,        -- central / state / psu / bank / defence / etc.
  status           TEXT         DEFAULT 'open', -- open / upcoming / closed
  apply_url        TEXT,
  notification_url TEXT,
  source_url       TEXT,
  state            TEXT,
  district         TEXT,
  city             TEXT,
  location_text    TEXT,
  lat              DOUBLE PRECISION,
  lon              DOUBLE PRECISION,
  posted_at        DATE,
  last_date        DATE,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- -------------------------------------------------------
-- B-tree indexes for filter columns
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_jobs_state      ON jobs (state);
CREATE INDEX IF NOT EXISTS idx_jobs_district   ON jobs (district);
CREATE INDEX IF NOT EXISTS idx_jobs_status     ON jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_last_date  ON jobs (last_date);
CREATE INDEX IF NOT EXISTS idx_jobs_category   ON jobs (category);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at  ON jobs (posted_at DESC);

-- -------------------------------------------------------
-- Full-text search: generated tsvector column + GIN index
-- -------------------------------------------------------
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS fts_vector TSVECTOR
    GENERATED ALWAYS AS (
      to_tsvector('english',
        coalesce(title, '') || ' ' ||
        coalesce(organization, '') || ' ' ||
        coalesce(board, '') || ' ' ||
        coalesce(location_text, '')
      )
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_jobs_fts ON jobs USING GIN (fts_vector);

-- -------------------------------------------------------
-- Trigram index for fuzzy search on title (pg_trgm)
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm ON jobs USING GIN (title gin_trgm_ops);

-- -------------------------------------------------------
-- PostGIS geography column (best-effort; skipped if extension unavailable)
-- The backend falls back to Haversine SQL when PostGIS is absent.
-- -------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_available_extensions WHERE name = 'postgis'
  ) THEN
    CREATE EXTENSION IF NOT EXISTS postgis;
    BEGIN
      ALTER TABLE jobs ADD COLUMN geo geography(Point, 4326)
        GENERATED ALWAYS AS (
          CASE WHEN lat IS NOT NULL AND lon IS NOT NULL
               THEN ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography
          END
        ) STORED;
      CREATE INDEX IF NOT EXISTS idx_jobs_geo ON jobs USING GIST (geo);
    EXCEPTION WHEN OTHERS THEN
      -- Column already exists or PostGIS setup error – ignore
      NULL;
    END;
  END IF;
END;
$$;

-- -------------------------------------------------------
-- Helper: keep updated_at current
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_jobs_updated_at ON jobs;
CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_jobs_updated_at();
