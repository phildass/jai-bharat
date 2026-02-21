-- Migration: Create jobs table with full-text search and geo support
-- Run with: supabase db push  OR  supabase migration up

-- ─── Extensions ──────────────────────────────────────────────────────────────

-- Trigram index support for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- PostGIS for geo queries (Supabase usually has this; gracefully skip if not)
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS postgis;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'PostGIS not available – geo nearby queries will use Haversine SQL';
END; $$;

-- ─── Jobs table ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jobs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text        NOT NULL,
  organization     text,
  board            text,
  category         text,
  status           text        NOT NULL DEFAULT 'active',
  apply_url        text,
  notification_url text,
  source_url       text,
  state            text,
  district         text,
  city             text,
  location_text    text,
  lat              double precision,
  lon              double precision,
  posted_at        date,
  last_date        date,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  -- Generated tsvector for full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '')         || ' ' ||
      coalesce(organization, '')  || ' ' ||
      coalesce(board, '')         || ' ' ||
      coalesce(category, '')      || ' ' ||
      coalesce(location_text, '') || ' ' ||
      coalesce(state, '')         || ' ' ||
      coalesce(district, '')      || ' ' ||
      coalesce(city, '')
    )
  ) STORED
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

-- Full-text search
CREATE INDEX IF NOT EXISTS jobs_search_vector_idx ON jobs USING GIN(search_vector);

-- Fuzzy title matching
CREATE INDEX IF NOT EXISTS jobs_title_trgm_idx ON jobs USING GIN(title gin_trgm_ops);

-- Filter columns
CREATE INDEX IF NOT EXISTS jobs_state_idx     ON jobs(state);
CREATE INDEX IF NOT EXISTS jobs_category_idx  ON jobs(category);
CREATE INDEX IF NOT EXISTS jobs_status_idx    ON jobs(status);
CREATE INDEX IF NOT EXISTS jobs_board_idx     ON jobs(board);
CREATE INDEX IF NOT EXISTS jobs_posted_at_idx ON jobs(posted_at DESC);
CREATE INDEX IF NOT EXISTS jobs_last_date_idx ON jobs(last_date);

-- ─── PostGIS geography column (conditional) ────────────────────────────────

DO $$ BEGIN
  IF (SELECT count(*) FROM pg_extension WHERE extname = 'postgis') > 0 THEN

    -- Add geography column if it does not already exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'jobs' AND column_name = 'location'
    ) THEN
      ALTER TABLE jobs ADD COLUMN location geography(Point, 4326);
    END IF;

    -- GiST spatial index
    CREATE INDEX IF NOT EXISTS jobs_location_gist_idx ON jobs USING GIST(location);

    -- Trigger: keep location in sync with lat/lon
    CREATE OR REPLACE FUNCTION jobs_sync_location()
    RETURNS TRIGGER LANGUAGE plpgsql AS $fn$
    BEGIN
      IF NEW.lat IS NOT NULL AND NEW.lon IS NOT NULL THEN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.lon, NEW.lat), 4326)::geography;
      ELSE
        NEW.location = NULL;
      END IF;
      RETURN NEW;
    END;
    $fn$;

    DROP TRIGGER IF EXISTS jobs_location_trigger ON jobs;
    CREATE TRIGGER jobs_location_trigger
      BEFORE INSERT OR UPDATE OF lat, lon ON jobs
      FOR EACH ROW EXECUTE FUNCTION jobs_sync_location();

  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'PostGIS setup skipped: %', SQLERRM;
END; $$;

-- ─── Geo cache table (reverse-geocoding results) ──────────────────────────

CREATE TABLE IF NOT EXISTS geo_cache (
  cache_key  text        PRIMARY KEY,   -- rounded "lat,lon"
  result     jsonb       NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS geo_cache_created_at_idx ON geo_cache(created_at);

-- ─── updated_at trigger ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jobs_updated_at_trigger ON jobs;
CREATE TRIGGER jobs_updated_at_trigger
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
