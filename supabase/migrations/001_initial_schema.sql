-- Migration: 001_initial_schema
-- Jai Bharat – PostgreSQL schema for jobs, FTS, and geo caching
-- Compatible with Supabase (PostgreSQL 15+)

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- trigram similarity search

-- ─── User subscriptions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID          NOT NULL UNIQUE,

  -- Trial tracking
  trial_started_at        TIMESTAMPTZ   DEFAULT NOW(),
  trial_ends_at           TIMESTAMPTZ   DEFAULT (NOW() + INTERVAL '24 hours'),
  trial_active            BOOLEAN       DEFAULT true,

  -- Payment tracking
  payment_status          TEXT          DEFAULT 'trial',
  -- 'trial' | 'pending_payment' | 'pending_otp' | 'active' | 'expired'
  payment_initiated_at    TIMESTAMPTZ,
  payment_completed_at    TIMESTAMPTZ,
  payment_amount          DECIMAL(10, 2) DEFAULT 116.82,
  payment_transaction_id  TEXT,
  payment_method          TEXT,

  -- OTP verification
  otp_code                VARCHAR(6),
  otp_generated_at        TIMESTAMPTZ,
  otp_verified_at         TIMESTAMPTZ,
  otp_attempts            INT           DEFAULT 0,

  -- Subscription (lifetime after payment)
  subscription_starts_at  TIMESTAMPTZ,
  subscription_active     BOOLEAN       DEFAULT false,

  -- Metadata
  created_at              TIMESTAMPTZ   DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id
  ON user_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status
  ON user_subscriptions(payment_status);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_otp
  ON user_subscriptions(otp_code)
  WHERE otp_code IS NOT NULL;

-- ─── Jobs ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id                          SERIAL        PRIMARY KEY,
  title                       TEXT          NOT NULL,
  organisation                TEXT          NOT NULL,
  source_url                  TEXT,
  official_notification_url   TEXT,
  source_hash                 TEXT          UNIQUE,  -- SHA-256 dedup key

  category                    TEXT,
  qualification               TEXT,
  status                      TEXT          DEFAULT 'open',
  -- 'open' | 'upcoming' | 'closed' | 'result_out'

  state                       TEXT,
  district                    TEXT,
  lat                         DOUBLE PRECISION,
  lon                         DOUBLE PRECISION,
  location_label              TEXT,

  vacancies                   INT,
  salary                      TEXT,
  apply_start_date            DATE,
  apply_end_date              DATE,
  description                 TEXT,

  -- Full-text search vector (auto-maintained by trigger below)
  search_vector               TSVECTOR,

  published_at                TIMESTAMPTZ   DEFAULT NOW(),
  created_at                  TIMESTAMPTZ   DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ   DEFAULT NOW()
);

-- ─── Full-text search ─────────────────────────────────────────────────────────
-- GIN index for tsvector FTS
CREATE INDEX IF NOT EXISTS idx_jobs_fts
  ON jobs USING GIN(search_vector);

-- Trigger function to keep search_vector current
CREATE OR REPLACE FUNCTION jobs_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.organisation, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.category, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_jobs_search_vector ON jobs;
CREATE TRIGGER trig_jobs_search_vector
  BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION jobs_search_vector_update();

-- ─── Trigram index for ILIKE / similarity search ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm
  ON jobs USING GIN(title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_jobs_organisation_trgm
  ON jobs USING GIN(organisation gin_trgm_ops);

-- ─── Geo + filter indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_jobs_lat_lon
  ON jobs(lat, lon)
  WHERE lat IS NOT NULL AND lon IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_state
  ON jobs(state);

CREATE INDEX IF NOT EXISTS idx_jobs_category
  ON jobs(category);

CREATE INDEX IF NOT EXISTS idx_jobs_status
  ON jobs(status);

CREATE INDEX IF NOT EXISTS idx_jobs_apply_end_date
  ON jobs(apply_end_date);

CREATE INDEX IF NOT EXISTS idx_jobs_published_at
  ON jobs(published_at DESC);

-- ─── Reverse-geocode cache ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS geo_cache (
  cache_key     TEXT          PRIMARY KEY,  -- "lat3dp,lon3dp"
  display_name  TEXT,
  city          TEXT,
  district      TEXT,
  state         TEXT,
  postcode      TEXT,
  country       TEXT,
  expires_at    TIMESTAMPTZ   NOT NULL,
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geo_cache_expires
  ON geo_cache(expires_at);
