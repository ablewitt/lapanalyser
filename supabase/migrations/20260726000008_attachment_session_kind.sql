-- Let an attachment be either an uploaded image or a reference to a session,
-- so users/admins can attach a session to a ticket after it's created (not
-- just at creation via support_tickets.session_id).

ALTER TABLE ticket_attachments
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'image' CHECK (kind IN ('image', 'session'));

ALTER TABLE ticket_attachments
  ADD COLUMN session_id UUID REFERENCES sessions(id) ON DELETE SET NULL;

-- Session refs carry no file, so the file columns are now optional.
ALTER TABLE ticket_attachments ALTER COLUMN storage_path DROP NOT NULL;
ALTER TABLE ticket_attachments ALTER COLUMN mime DROP NOT NULL;
ALTER TABLE ticket_attachments ALTER COLUMN size_bytes DROP NOT NULL;

-- Each kind must carry its own payload.
ALTER TABLE ticket_attachments ADD CONSTRAINT ticket_attachments_shape CHECK (
  (kind = 'image' AND storage_path IS NOT NULL)
  OR (kind = 'session' AND session_id IS NOT NULL)
);
