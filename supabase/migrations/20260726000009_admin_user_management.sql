-- ============================================================
-- Admin: user & session management
-- ============================================================
-- auth.users (email, last_sign_in_at) isn't reachable under RLS, and deleting
-- a user needs elevated privileges — so these go through SECURITY DEFINER RPCs
-- guarded by is_admin(). Session write access is handled with RLS bypasses.

-- ── list users with usage ─────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_list_users()
RETURNS TABLE (
  id              UUID,
  username        TEXT,
  email           TEXT,
  role            TEXT,
  created_at      TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  session_count   INTEGER,
  storage_bytes   BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  RETURN QUERY
    SELECT
      p.id,
      p.username,
      u.email::text,
      p.role,
      p.created_at,
      u.last_sign_in_at,
      (SELECT count(*)::int FROM sessions s WHERE s.user_id = p.id),
      COALESCE((
        SELECT sum((o.metadata->>'size')::bigint)
        FROM storage.objects o
        WHERE o.bucket_id = 'session-files'
          AND (storage.foldername(o.name))[1] = p.id::text
      ), 0)
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_list_users() TO authenticated;

-- ── change a user's role ──────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_set_role(target_id UUID, new_role TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF new_role NOT IN ('user', 'admin') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  UPDATE profiles SET role = new_role WHERE id = target_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_role(UUID, TEXT) TO authenticated;

-- ── delete a user (cascades DB rows; also clears their session files) ──
CREATE OR REPLACE FUNCTION admin_delete_user(target_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF target_id = auth.uid() THEN RAISE EXCEPTION 'You cannot delete your own account here'; END IF;

  DELETE FROM storage.objects
  WHERE bucket_id = 'session-files'
    AND (storage.foldername(name))[1] = target_id::text;

  -- auth.users cascades to profiles, sessions, tickets, etc.
  DELETE FROM auth.users WHERE id = target_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_delete_user(UUID) TO authenticated;

-- ── session write bypasses for admins ─────────────────────────
DROP POLICY sessions_update ON sessions;
CREATE POLICY sessions_update ON sessions FOR UPDATE
  TO authenticated USING (user_id = auth.uid() OR is_admin());

DROP POLICY sessions_delete ON sessions;
CREATE POLICY sessions_delete ON sessions FOR DELETE
  TO authenticated USING (user_id = auth.uid() OR is_admin());

DROP POLICY storage_delete ON storage.objects;
CREATE POLICY storage_delete ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'session-files'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
  );
