-- ============================================================
-- Image attachments for ticket messages
-- ============================================================
-- Attachments hang off a message, so their visibility follows the message's
-- RLS: internal-note images never surface to a non-admin. Storage paths are
-- {ticket_id}/{message_id}/{file} so object policies can check both.

-- ── bucket (private, images only, 5 MB cap) ───────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-attachments', 'ticket-attachments', false,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
);

-- ── metadata table ────────────────────────────────────────────
CREATE TABLE ticket_attachments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  message_id   UUID NOT NULL REFERENCES support_messages(id) ON DELETE CASCADE,
  uploader_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  mime         TEXT NOT NULL,
  size_bytes   INTEGER NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ticket_attachments_message_id_idx ON ticket_attachments(message_id);
CREATE INDEX ticket_attachments_ticket_id_idx  ON ticket_attachments(ticket_id);

ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Visible only if the linked message is visible to the caller. The subquery
-- runs under the caller's RLS, so support_messages' internal-note rule is
-- inherited for free (no separate is_internal check needed here).
CREATE POLICY ticket_attachments_select ON ticket_attachments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM support_messages m WHERE m.id = message_id)
  );

CREATE POLICY ticket_attachments_insert ON ticket_attachments FOR INSERT
  TO authenticated WITH CHECK (
    uploader_id = auth.uid()
    AND EXISTS (SELECT 1 FROM support_messages m WHERE m.id = message_id)
  );

CREATE POLICY ticket_attachments_delete ON ticket_attachments FOR DELETE
  USING (uploader_id = auth.uid() OR is_admin());

GRANT SELECT, INSERT, DELETE ON ticket_attachments TO authenticated;

-- ── storage object policies ───────────────────────────────────
-- Upload: ticket owner or admin, into that ticket's folder.
CREATE POLICY ticket_attach_insert ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'ticket-attachments'
    AND (is_admin() OR i_own_ticket((storage.foldername(name))[1]::uuid))
  );

-- Read: admins, or anyone who can see the message the file hangs off
-- (path segment [2] is the message_id). Hides internal-note images.
CREATE POLICY ticket_attach_select ON storage.objects FOR SELECT
  TO authenticated USING (
    bucket_id = 'ticket-attachments'
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM support_messages m
        WHERE m.id = (storage.foldername(name))[2]::uuid
      )
    )
  );

CREATE POLICY ticket_attach_delete ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'ticket-attachments'
    AND (is_admin() OR i_own_ticket((storage.foldername(name))[1]::uuid))
  );
