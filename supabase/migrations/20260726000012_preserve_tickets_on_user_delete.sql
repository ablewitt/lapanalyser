-- Keep support history when a user is deleted. Tickets, messages and
-- attachments referenced auth.users ON DELETE CASCADE, so deleting the account
-- erased the whole thread. Switch to ON DELETE SET NULL so the records survive
-- with a null author (rendered as "deleted user"). Admins still see them via
-- the is_admin() RLS bypass; the deleted user can no longer sign in.

-- ── tickets ───────────────────────────────────────────────────
ALTER TABLE support_tickets ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE support_tickets DROP CONSTRAINT support_tickets_user_id_fkey;
ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── messages ──────────────────────────────────────────────────
ALTER TABLE support_messages ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE support_messages DROP CONSTRAINT support_messages_author_id_fkey;
ALTER TABLE support_messages ADD CONSTRAINT support_messages_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── attachments ───────────────────────────────────────────────
ALTER TABLE ticket_attachments ALTER COLUMN uploader_id DROP NOT NULL;
ALTER TABLE ticket_attachments DROP CONSTRAINT ticket_attachments_uploader_id_fkey;
ALTER TABLE ticket_attachments ADD CONSTRAINT ticket_attachments_uploader_id_fkey
  FOREIGN KEY (uploader_id) REFERENCES auth.users(id) ON DELETE SET NULL;
