-- Let admins read any session file, so they can open a session referenced from
-- a support ticket. The DB-row bypass already exists (admin_select_bypass);
-- this extends the same visibility to the storage object.

DROP POLICY storage_select ON storage.objects;

CREATE POLICY storage_select ON storage.objects FOR SELECT
  TO authenticated USING (
    bucket_id = 'session-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR is_admin()
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
