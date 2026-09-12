-- ===========================================================================
--  NOVA — site_settings table
--
--  Run this ONCE in your database (Supabase SQL Editor, or psql).
--  It is idempotent — safe to run again.
--
--  This stores the values you edit under  Admin → Site appearance
--  (hero media, navigation labels, announcement bar, seasonal offer card,
--   welcome popup, and home page wording).
--
--  NOTE: The app also self-heals — it will create this table automatically
--  the first time it needs it. This file is provided in case you want to
--  create it ahead of time or on a database where the app role has no DDL
--  permission.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS site_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Make sure the role the app connects as can write to it.
-- On Supabase the connection string uses the `postgres` role, which already
-- owns tables it created; these grants keep other setups working too.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    GRANT ALL ON TABLE site_settings TO postgres;
  END IF;
END $$;

-- Optional: confirm it exists.
-- SELECT count(*) AS rows FROM site_settings;
