-- ============================================================
--  Dr Mohiuddin Urology - PostgreSQL schema (Supabase)
--  Applied via the Supabase MCP `apply_migration` tool.
--  This file is kept in the repo as a readable reference of what's live;
--  it is not executed directly by any npm script.
-- ============================================================

-- Reused by every table that needs an auto-updating `updated_at` column,
-- since Postgres has no equivalent of MySQL's ON UPDATE CURRENT_TIMESTAMP.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------- Auth ----------

CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(120)  NOT NULL,
  email          VARCHAR(190)  NOT NULL UNIQUE,
  password_hash  VARCHAR(255)  NOT NULL,
  role           TEXT NOT NULL DEFAULT 'EDITOR' CHECK (role IN ('ADMIN','EDITOR')),
  is_active      SMALLINT      NOT NULL DEFAULT 1,
  -- bumped on password change / forced logout; invalidates already-issued JWTs
  token_version  INTEGER       NOT NULL DEFAULT 1,
  last_login_at  TIMESTAMPTZ   NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Throttles brute-force login. Rows older than 24h are pruned on write.
CREATE TABLE IF NOT EXISTS login_attempts (
  id         BIGSERIAL PRIMARY KEY,
  email      VARCHAR(190) NOT NULL,
  ip         VARCHAR(64)  NOT NULL DEFAULT '',
  success    SMALLINT     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_attempts_email_time ON login_attempts (email, created_at);
CREATE INDEX ix_attempts_ip_time ON login_attempts (ip, created_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id         BIGSERIAL PRIMARY KEY,
  user_id    INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(190) NOT NULL DEFAULT '',
  action     VARCHAR(60)  NOT NULL,
  entity     VARCHAR(60)  NOT NULL,
  entity_id  VARCHAR(60)  NULL,
  detail     TEXT         NULL,
  ip         VARCHAR(64)  NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_audit_time ON audit_logs (created_at);

-- ---------- Site content ----------

CREATE TABLE IF NOT EXISTS settings (
  key        VARCHAR(80)  PRIMARY KEY,
  value      TEXT         NULL,
  group_name VARCHAR(40)  NOT NULL DEFAULT 'general',
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_settings_group ON settings (group_name);
CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS services (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(160) NOT NULL,
  slug        VARCHAR(160) NOT NULL UNIQUE,
  summary     VARCHAR(500) NULL,
  body        TEXT         NULL,
  icon        VARCHAR(60)  NULL,
  image_path  VARCHAR(255) NULL,
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  is_active   SMALLINT     NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_services_order ON services (is_active, sort_order);
CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS stats (
  id         SERIAL PRIMARY KEY,
  label      VARCHAR(120) NOT NULL,
  value      VARCHAR(40)  NOT NULL,
  suffix     VARCHAR(20)  NULL,
  icon       VARCHAR(60)  NULL,
  sort_order INTEGER      NOT NULL DEFAULT 0,
  is_active  SMALLINT     NOT NULL DEFAULT 1
);
CREATE INDEX ix_stats_order ON stats (is_active, sort_order);

CREATE TABLE IF NOT EXISTS credentials (
  id         SERIAL PRIMARY KEY,
  kind       TEXT NOT NULL DEFAULT 'degree' CHECK (kind IN ('degree','experience','membership','award')),
  title      VARCHAR(200) NOT NULL,
  subtitle   VARCHAR(255) NULL,
  period     VARCHAR(80)  NULL,
  sort_order INTEGER      NOT NULL DEFAULT 0,
  is_active  SMALLINT     NOT NULL DEFAULT 1
);
CREATE INDEX ix_cred_order ON credentials (kind, is_active, sort_order);

CREATE TABLE IF NOT EXISTS chambers (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(160) NOT NULL,
  address    VARCHAR(400) NULL,
  days_text  VARCHAR(160) NULL,
  time_text  VARCHAR(160) NULL,
  phone      VARCHAR(80)  NULL,
  map_url    VARCHAR(500) NULL,
  sort_order INTEGER      NOT NULL DEFAULT 0,
  is_active  SMALLINT     NOT NULL DEFAULT 1
);
CREATE INDEX ix_chambers_order ON chambers (is_active, sort_order);

CREATE TABLE IF NOT EXISTS gallery_images (
  id         SERIAL PRIMARY KEY,
  file_path  VARCHAR(255) NOT NULL,
  alt_text   VARCHAR(255) NOT NULL DEFAULT '',
  caption    VARCHAR(255) NULL,
  width      INTEGER NULL,
  height     INTEGER NULL,
  sort_order INTEGER      NOT NULL DEFAULT 0,
  is_active  SMALLINT     NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_gallery_order ON gallery_images (is_active, sort_order, id);

-- kind='video'    -> youtube_key holds an 11-char video id
-- kind='playlist' -> youtube_key holds a playlist id (PL..., UU..., OL...)
CREATE TABLE IF NOT EXISTS videos (
  id          SERIAL PRIMARY KEY,
  kind        TEXT NOT NULL DEFAULT 'video' CHECK (kind IN ('video','playlist')),
  youtube_key VARCHAR(64)  NOT NULL,
  title       VARCHAR(255) NULL,
  source_url  VARCHAR(500) NULL,
  thumb_url   VARCHAR(500) NULL,
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  is_active   SMALLINT     NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (kind, youtube_key)
);
CREATE INDEX ix_videos_order ON videos (is_active, sort_order, id);

CREATE TABLE IF NOT EXISTS faqs (
  id         SERIAL PRIMARY KEY,
  question   VARCHAR(400) NOT NULL,
  answer     TEXT         NOT NULL,
  sort_order INTEGER      NOT NULL DEFAULT 0,
  is_active  SMALLINT     NOT NULL DEFAULT 1
);
CREATE INDEX ix_faqs_order ON faqs (is_active, sort_order);

CREATE TABLE IF NOT EXISTS testimonials (
  id           SERIAL PRIMARY KEY,
  patient_name VARCHAR(160) NOT NULL,
  location     VARCHAR(160) NULL,
  rating       SMALLINT     NOT NULL DEFAULT 5,
  -- 'google' marks a review copied over from Google Reviews (shows a Google badge
  -- on the card); 'manual' is anything entered directly.
  source       TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','google')),
  source_url   VARCHAR(500) NULL,
  message      TEXT         NOT NULL,
  sort_order   INTEGER      NOT NULL DEFAULT 0,
  is_active    SMALLINT     NOT NULL DEFAULT 1
);
CREATE INDEX ix_testi_order ON testimonials (is_active, sort_order);

CREATE TABLE IF NOT EXISTS appointments (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(160) NOT NULL,
  phone          VARCHAR(40)  NOT NULL,
  email          VARCHAR(190) NULL,
  chamber_id     INTEGER NULL REFERENCES chambers(id) ON DELETE SET NULL,
  preferred_date DATE         NULL,
  message        TEXT         NULL,
  status         TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','confirmed','cancelled')),
  ip             VARCHAR(64)  NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_appt_status ON appointments (status, created_at);

-- ---------- Row Level Security ----------
-- The app connects with a direct, privileged Postgres connection (never through
-- PostgREST/the anon key), so RLS never gates *our* access. It's still enabled
-- with no permissive policies on every table, so Supabase's public anon/
-- authenticated API roles - the ones a leaked publishable key could reach -
-- see nothing, and `get_advisors` doesn't flag these tables as unprotected.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE chambers ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
