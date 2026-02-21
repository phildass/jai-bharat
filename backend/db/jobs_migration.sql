-- Jai Bharat – Govt Jobs: Database Migration
-- Run AFTER the base schema.sql has been applied.
-- Requires: PostgreSQL 12+ with pg_trgm extension.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- job_sources – ingestion source registry
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_sources (
  id          SERIAL      PRIMARY KEY,
  name        TEXT        NOT NULL,
  base_url    TEXT        NOT NULL,
  type        TEXT        NOT NULL CHECK (type IN ('rss', 'html', 'pdf')),
  config      JSONB       NOT NULL DEFAULT '{}',
  active      BOOLEAN     NOT NULL DEFAULT true,
  last_run_at TIMESTAMP,
  created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- jobs – enhanced jobs table (replaces the basic jobs table if applicable)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jobs (
  id                        SERIAL      PRIMARY KEY,
  source_id                 INT         REFERENCES job_sources(id),

  -- Identity / provenance
  title                     TEXT        NOT NULL,
  organisation              TEXT        NOT NULL,
  source_url                TEXT,
  official_notification_url TEXT,
  source_hash               TEXT        UNIQUE,   -- SHA-256 of normalised signature for dedup

  -- Classification
  category                  TEXT,                 -- e.g. 'Engineering', 'Police', 'Railway'
  qualification             TEXT,                 -- e.g. '10th', '12th', 'Graduate', 'Post Graduate'
  status                    TEXT        NOT NULL DEFAULT 'open'
                              CHECK (status IN ('open', 'closed', 'result_out', 'upcoming')),

  -- Location
  state                     TEXT,
  district                  TEXT,
  lat                       DOUBLE PRECISION,
  lon                       DOUBLE PRECISION,
  location_label            TEXT,                 -- human-readable e.g. "Delhi, India"

  -- Vacancy & details
  vacancies                 INT,
  description               TEXT,
  age_limit                 TEXT,
  salary                    TEXT,

  -- Dates
  apply_start_date          DATE,
  apply_end_date            DATE,
  exam_date                 DATE,
  published_at              TIMESTAMP   NOT NULL DEFAULT NOW(),

  -- Full-text search vector (auto-updated via trigger)
  search_vector             TSVECTOR,

  -- Metadata
  created_at                TIMESTAMP   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_jobs_status      ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_state       ON jobs(state);
CREATE INDEX IF NOT EXISTS idx_jobs_category    ON jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_source_hash ON jobs(source_hash);
CREATE INDEX IF NOT EXISTS idx_jobs_published   ON jobs(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_apply_end   ON jobs(apply_end_date);

-- GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_jobs_fts ON jobs USING GIN(search_vector);

-- Trigram indexes for fuzzy matching on title / organisation
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm ON jobs USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jobs_org_trgm   ON jobs USING GIN(organisation gin_trgm_ops);

-- BRIN index on lat/lon for range scans (PostGIS not required)
CREATE INDEX IF NOT EXISTS idx_jobs_lat ON jobs(lat);
CREATE INDEX IF NOT EXISTS idx_jobs_lon ON jobs(lon);

-- ---------------------------------------------------------------------------
-- Trigger: auto-update search_vector on INSERT / UPDATE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION jobs_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.organisation, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.category, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.state, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.district, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.qualification, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'D');
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS jobs_search_vector_trigger ON jobs;
CREATE TRIGGER jobs_search_vector_trigger
  BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION jobs_search_vector_update();

-- ---------------------------------------------------------------------------
-- geo_cache – caches reverse-geocoding results (LocationIQ)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS geo_cache (
  cache_key   TEXT        PRIMARY KEY,  -- "lat:lon" rounded to 4dp
  result      JSONB       NOT NULL,
  cached_at   TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geo_cache_cached_at ON geo_cache(cached_at);
