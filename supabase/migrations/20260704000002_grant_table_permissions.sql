-- RLS policies control row visibility but the underlying role still needs
-- table-level GRANT permissions. The `authenticated` role needs full access
-- (RLS enforces what each user can actually see/modify).
-- `anon` gets SELECT only on tables that have public rows.

GRANT SELECT, INSERT, UPDATE, DELETE ON sessions           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON track_configs      TO authenticated;
GRANT SELECT, INSERT, DELETE         ON session_shares     TO authenticated;
GRANT SELECT, INSERT, DELETE         ON track_config_shares TO authenticated;
GRANT SELECT, UPDATE                 ON user_settings      TO authenticated;
GRANT SELECT, UPDATE                 ON profiles           TO authenticated;
GRANT SELECT, INSERT                 ON tracks             TO authenticated;

-- anon can read public sessions and track configs (for the public search feature)
GRANT SELECT ON sessions        TO anon;
GRANT SELECT ON track_configs   TO anon;
GRANT SELECT ON tracks          TO anon;
GRANT SELECT ON profiles        TO anon;
