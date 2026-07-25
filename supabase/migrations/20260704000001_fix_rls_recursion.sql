-- Fix infinite RLS recursion caused by sessions ↔ session_shares and
-- track_configs ↔ track_config_shares mutually referencing each other in policies.
-- Solution: SECURITY DEFINER helper functions that bypass RLS for the cross-table checks.

-- ── Helper functions ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_session_shared_with_me(p_session_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM session_shares
    WHERE session_id = p_session_id
      AND shared_with_user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION i_own_session(p_session_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM sessions
    WHERE id = p_session_id
      AND user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION is_track_config_shared_with_me(p_config_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM track_config_shares
    WHERE config_id = p_config_id
      AND shared_with_user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION i_own_track_config(p_config_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM track_configs
    WHERE id = p_config_id
      AND user_id = auth.uid()
  )
$$;

-- ── Rebuild sessions policies ─────────────────────────────────

DROP POLICY sessions_select ON sessions;

CREATE POLICY sessions_select ON sessions FOR SELECT USING (
  user_id = auth.uid()
  OR is_public = true
  OR is_session_shared_with_me(id)
);

-- ── Rebuild session_shares policies ──────────────────────────

DROP POLICY session_shares_select ON session_shares;
DROP POLICY session_shares_insert ON session_shares;
DROP POLICY session_shares_delete ON session_shares;

CREATE POLICY session_shares_select ON session_shares FOR SELECT USING (
  shared_with_user_id = auth.uid()
  OR i_own_session(session_id)
);

CREATE POLICY session_shares_insert ON session_shares FOR INSERT
  TO authenticated WITH CHECK (i_own_session(session_id));

CREATE POLICY session_shares_delete ON session_shares FOR DELETE
  TO authenticated USING (i_own_session(session_id));

-- ── Rebuild track_configs policies ───────────────────────────

DROP POLICY track_configs_select ON track_configs;

CREATE POLICY track_configs_select ON track_configs FOR SELECT USING (
  user_id = auth.uid()
  OR is_public = true
  OR is_track_config_shared_with_me(id)
);

-- ── Rebuild track_config_shares policies ─────────────────────

DROP POLICY track_config_shares_select ON track_config_shares;
DROP POLICY track_config_shares_insert ON track_config_shares;
DROP POLICY track_config_shares_delete ON track_config_shares;

CREATE POLICY track_config_shares_select ON track_config_shares FOR SELECT USING (
  shared_with_user_id = auth.uid()
  OR i_own_track_config(config_id)
);

CREATE POLICY track_config_shares_insert ON track_config_shares FOR INSERT
  TO authenticated WITH CHECK (i_own_track_config(config_id));

CREATE POLICY track_config_shares_delete ON track_config_shares FOR DELETE
  TO authenticated USING (i_own_track_config(config_id));
