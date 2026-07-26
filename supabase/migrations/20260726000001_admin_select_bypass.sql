-- Give admins read visibility across all users' sessions and track configs.
-- Adds `OR is_admin()` to the SELECT policies so the admin dashboard/counts
-- and (later) session management see every row. is_admin() is SECURITY
-- DEFINER, so this does not reintroduce RLS recursion.
--
-- Scope: SELECT only. Admin write/delete on other users' rows is handled by
-- explicit SECURITY DEFINER RPCs in a later phase, not by broad RLS.

DROP POLICY sessions_select ON sessions;

CREATE POLICY sessions_select ON sessions FOR SELECT USING (
  user_id = auth.uid()
  OR is_public = true
  OR is_session_shared_with_me(id)
  OR is_admin()
);

DROP POLICY track_configs_select ON track_configs;

CREATE POLICY track_configs_select ON track_configs FOR SELECT USING (
  user_id = auth.uid()
  OR is_public = true
  OR is_track_config_shared_with_me(id)
  OR is_admin()
);
