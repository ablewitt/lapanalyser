-- ============================================================
-- LapAnalyser — initial schema
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────
-- Public display name for each user (auth.users is private).
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create a profile row when a user signs up.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── tracks ───────────────────────────────────────────────────
-- Canonical track records. Any authenticated user can add a track.
CREATE TABLE tracks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── sessions ─────────────────────────────────────────────────
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,          -- original uploaded filename
  display_name  TEXT,                   -- user-editable label
  venue_raw     TEXT,                   -- venue string extracted from VBO comments
  track_id      UUID REFERENCES tracks(id) ON DELETE SET NULL,
  date_recorded TIMESTAMPTZ,
  is_public     BOOLEAN NOT NULL DEFAULT false,
  storage_path  TEXT NOT NULL,          -- path inside the session-files bucket
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_track_id_idx ON sessions(track_id);

-- ── track_configs ─────────────────────────────────────────────
-- Sectors + speed traps for a track, scoped to a user.
CREATE TABLE track_configs (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id  UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_public  BOOLEAN NOT NULL DEFAULT false,
  sectors   JSONB NOT NULL DEFAULT '[]',
  traps     JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX track_configs_user_id_idx ON track_configs(user_id);
CREATE INDEX track_configs_track_id_idx ON track_configs(track_id);

-- Enforce at most one default config per (user, track).
-- When a config is set as default, clear the previous default automatically.
CREATE OR REPLACE FUNCTION enforce_single_default_config()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE track_configs
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND track_id = NEW.track_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_single_default_config
  BEFORE INSERT OR UPDATE ON track_configs
  FOR EACH ROW EXECUTE FUNCTION enforce_single_default_config();

-- ── sharing tables ────────────────────────────────────────────
CREATE TABLE session_shares (
  session_id           UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  shared_with_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, shared_with_user_id)
);

CREATE TABLE track_config_shares (
  config_id            UUID NOT NULL REFERENCES track_configs(id) ON DELETE CASCADE,
  shared_with_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (config_id, shared_with_user_id)
);

-- ── user_settings ─────────────────────────────────────────────
CREATE TABLE user_settings (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  map_base      TEXT NOT NULL DEFAULT 'standard',
  show_heatmap  BOOLEAN NOT NULL DEFAULT false,
  show_sectors  BOOLEAN NOT NULL DEFAULT true,
  show_events   BOOLEAN NOT NULL DEFAULT true,
  show_traps    BOOLEAN NOT NULL DEFAULT true,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create default settings row when a user signs up.
CREATE OR REPLACE FUNCTION handle_new_user_settings()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO user_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_settings();

-- ── updated_at triggers ───────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_track_configs_updated_at
  BEFORE UPDATE ON track_configs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Row-Level Security
-- ============================================================

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_configs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_shares    ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_config_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings     ENABLE ROW LEVEL SECURITY;

-- ── profiles ─────────────────────────────────────────────────
-- Anyone authenticated can read any profile (needed to display sharer names).
CREATE POLICY profiles_select ON profiles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY profiles_update ON profiles FOR UPDATE
  TO authenticated USING (id = auth.uid());

-- ── tracks ───────────────────────────────────────────────────
-- Tracks are public reference data.
CREATE POLICY tracks_select ON tracks FOR SELECT USING (true);

CREATE POLICY tracks_insert ON tracks FOR INSERT
  TO authenticated WITH CHECK (true);

-- ── sessions ─────────────────────────────────────────────────
CREATE POLICY sessions_select ON sessions FOR SELECT USING (
  user_id = auth.uid()
  OR is_public = true
  OR EXISTS (
    SELECT 1 FROM session_shares
    WHERE session_id = id AND shared_with_user_id = auth.uid()
  )
);

CREATE POLICY sessions_insert ON sessions FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY sessions_update ON sessions FOR UPDATE
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY sessions_delete ON sessions FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- ── track_configs ─────────────────────────────────────────────
CREATE POLICY track_configs_select ON track_configs FOR SELECT USING (
  user_id = auth.uid()
  OR is_public = true
  OR EXISTS (
    SELECT 1 FROM track_config_shares
    WHERE config_id = id AND shared_with_user_id = auth.uid()
  )
);

CREATE POLICY track_configs_insert ON track_configs FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY track_configs_update ON track_configs FOR UPDATE
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY track_configs_delete ON track_configs FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- ── session_shares ────────────────────────────────────────────
-- Visible to the sharer (session owner) and the recipient.
CREATE POLICY session_shares_select ON session_shares FOR SELECT USING (
  shared_with_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM sessions WHERE id = session_id AND user_id = auth.uid()
  )
);

CREATE POLICY session_shares_insert ON session_shares FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND user_id = auth.uid())
  );

CREATE POLICY session_shares_delete ON session_shares FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND user_id = auth.uid())
  );

-- ── track_config_shares ───────────────────────────────────────
CREATE POLICY track_config_shares_select ON track_config_shares FOR SELECT USING (
  shared_with_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM track_configs WHERE id = config_id AND user_id = auth.uid()
  )
);

CREATE POLICY track_config_shares_insert ON track_config_shares FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM track_configs WHERE id = config_id AND user_id = auth.uid())
  );

CREATE POLICY track_config_shares_delete ON track_config_shares FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM track_configs WHERE id = config_id AND user_id = auth.uid())
  );

-- ── user_settings ─────────────────────────────────────────────
CREATE POLICY user_settings_select ON user_settings FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY user_settings_update ON user_settings FOR UPDATE
  TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- Storage bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('session-files', 'session-files', false);

-- Users can upload to their own folder: {user_id}/{session_id}
CREATE POLICY storage_insert ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'session-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own files; others can read if the session is public or shared.
CREATE POLICY storage_select ON storage.objects FOR SELECT
  TO authenticated USING (
    bucket_id = 'session-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM sessions
        WHERE storage_path = name
          AND (
            is_public = true
            OR EXISTS (
              SELECT 1 FROM session_shares
              WHERE session_id = sessions.id AND shared_with_user_id = auth.uid()
            )
          )
      )
    )
  );

CREATE POLICY storage_delete ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'session-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
