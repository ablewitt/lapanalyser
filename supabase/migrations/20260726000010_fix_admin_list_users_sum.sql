-- Fix "structure of query does not match function result type": sum() over a
-- bigint returns numeric, not bigint, so storage_bytes didn't match the
-- declared BIGINT. Cast the aggregate result explicitly.

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
      ), 0)::bigint
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    ORDER BY p.created_at DESC;
END;
$$;
