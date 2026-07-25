-- ── Add username to profiles ─────────────────────────────────

ALTER TABLE profiles ADD COLUMN username TEXT;

-- Case-insensitive uniqueness
CREATE UNIQUE INDEX profiles_username_ci_idx ON profiles (lower(username));

-- Format constraint: 3-30 chars, alphanumeric + underscore
ALTER TABLE profiles ADD CONSTRAINT profiles_username_format
  CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$');

-- ── Update trigger to capture username from sign-up metadata ──

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (
    NEW.id,
    NULLIF(trim(NEW.raw_user_meta_data->>'username'), '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ── Allow anon to check username availability during sign-up ──

GRANT SELECT (id, username) ON profiles TO anon;

CREATE POLICY profiles_select_anon ON profiles FOR SELECT
  TO anon USING (true);

-- ── SECURITY DEFINER: find user by username OR email ─────────
-- Returns (id, username) only — never exposes email to caller.

CREATE OR REPLACE FUNCTION lookup_user(query TEXT)
RETURNS TABLE (id UUID, username TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Try username first (case-insensitive)
  RETURN QUERY
    SELECT p.id, p.username
    FROM profiles p
    WHERE lower(p.username) = lower(trim(query))
    LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Try email via auth.users (SECURITY DEFINER permits access)
  RETURN QUERY
    SELECT p.id, p.username
    FROM auth.users u
    JOIN profiles p ON p.id = u.id
    WHERE lower(u.email) = lower(trim(query))
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION lookup_user(TEXT) TO authenticated;
