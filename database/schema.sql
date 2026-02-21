-- Jai Bharat – PostgreSQL Schema
-- User subscriptions table for 24-hour trial and lifetime payment tracking

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL,

  -- Trial tracking
  trial_started_at        TIMESTAMP   DEFAULT NOW(),
  trial_ends_at           TIMESTAMP   DEFAULT (NOW() + INTERVAL '24 hours'),
  trial_active            BOOLEAN     DEFAULT true,

  -- Payment tracking
  payment_status          TEXT        DEFAULT 'trial',
  -- 'trial' | 'pending_payment' | 'pending_otp' | 'active' | 'expired'
  payment_initiated_at    TIMESTAMP,
  payment_completed_at    TIMESTAMP,
  payment_amount          DECIMAL(10, 2) DEFAULT 116.82,
  payment_transaction_id  TEXT,
  payment_method          TEXT,

  -- OTP verification
  otp_code                VARCHAR(6),
  otp_generated_at        TIMESTAMP,
  otp_verified_at         TIMESTAMP,
  otp_attempts            INT         DEFAULT 0,

  -- Subscription (lifetime after payment)
  subscription_starts_at  TIMESTAMP,
  subscription_active     BOOLEAN     DEFAULT false,

  -- Metadata
  created_at              TIMESTAMP   DEFAULT NOW(),
  updated_at              TIMESTAMP   DEFAULT NOW(),

  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id
  ON user_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status
  ON user_subscriptions(payment_status);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_otp
  ON user_subscriptions(otp_code)
  WHERE otp_code IS NOT NULL;

-- ─── Jobs table (used by "Jobs Near Me" feature) ─────────────────────────────

CREATE TABLE IF NOT EXISTS jobs (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 TEXT        NOT NULL,
  department            TEXT        NOT NULL,
  source                TEXT        NOT NULL,  -- e.g., UPSC, SSC, State PSC
  apply_url             TEXT        NOT NULL,
  notification_pdf_url  TEXT,
  state                 TEXT        NOT NULL,
  district              TEXT        NOT NULL,
  city                  TEXT,
  location_text         TEXT        NOT NULL,
  lat                   DOUBLE PRECISION NOT NULL,
  lon                   DOUBLE PRECISION NOT NULL,
  posted_at             DATE        NOT NULL DEFAULT CURRENT_DATE,
  last_date             DATE,
  created_at            TIMESTAMP   DEFAULT NOW(),
  updated_at            TIMESTAMP   DEFAULT NOW()
);

-- Composite index to speed up bounding-box pre-filter before Haversine sort
CREATE INDEX IF NOT EXISTS idx_jobs_lat_lon
  ON jobs(lat, lon);

CREATE INDEX IF NOT EXISTS idx_jobs_state
  ON jobs(state);

CREATE INDEX IF NOT EXISTS idx_jobs_department
  ON jobs(department);

-- Prevent exact duplicates when ingesting from external sources
ALTER TABLE jobs ADD CONSTRAINT IF NOT EXISTS uq_jobs_title_state_district UNIQUE (title, state, district);
