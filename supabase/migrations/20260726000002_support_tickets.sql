-- ============================================================
-- Support tickets
-- ============================================================
-- Replaces the mailto stub with an in-app ticket system. The DB is the
-- source of truth; email (if added later) becomes a notification transport.

-- ── support_tickets ───────────────────────────────────────────
CREATE TABLE support_tickets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject    TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'other'
             CHECK (category IN ('bug', 'feature', 'account', 'data', 'other')),
  status     TEXT NOT NULL DEFAULT 'open'
             CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority   TEXT NOT NULL DEFAULT 'normal'
             CHECK (priority IN ('low', 'normal', 'high')),
  -- Optional link to the session the ticket is about (e.g. "lap didn't
  -- detect"). SET NULL so deleting a session doesn't delete its tickets.
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX support_tickets_user_id_idx ON support_tickets(user_id);
CREATE INDEX support_tickets_status_idx  ON support_tickets(status);

CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── support_messages ──────────────────────────────────────────
-- Threaded replies. is_internal notes are admin-only (hidden from the user).
CREATE TABLE support_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX support_messages_ticket_id_idx ON support_messages(ticket_id);

-- ── ownership helper (SECURITY DEFINER, avoids RLS recursion) ──
CREATE OR REPLACE FUNCTION i_own_ticket(p_ticket_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM support_tickets
    WHERE id = p_ticket_id
      AND user_id = auth.uid()
  )
$$;

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE support_tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- tickets: owner or admin can see/modify.
CREATE POLICY support_tickets_select ON support_tickets FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY support_tickets_insert ON support_tickets FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY support_tickets_update ON support_tickets FOR UPDATE
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY support_tickets_delete ON support_tickets FOR DELETE
  USING (user_id = auth.uid() OR is_admin());

-- messages: admins see all; owners see non-internal messages on their tickets.
CREATE POLICY support_messages_select ON support_messages FOR SELECT
  USING (
    is_admin()
    OR (is_internal = false AND i_own_ticket(ticket_id))
  );

-- Insert: you author as yourself; admins may post anywhere/internally,
-- owners may post only non-internal messages on their own tickets.
CREATE POLICY support_messages_insert ON support_messages FOR INSERT
  TO authenticated WITH CHECK (
    author_id = auth.uid()
    AND (
      is_admin()
      OR (is_internal = false AND i_own_ticket(ticket_id))
    )
  );

-- ── grants (RLS still governs row visibility) ─────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON support_tickets  TO authenticated;
GRANT SELECT, INSERT                 ON support_messages TO authenticated;
