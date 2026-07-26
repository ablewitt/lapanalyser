-- ============================================================
-- Seen/unseen tracking for ticket messages
-- ============================================================
-- Per-user, per-ticket last-read marker. Works for both the ticket owner and
-- admins (each tracks their own read state), and syncs across devices.

CREATE TABLE ticket_reads (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_id    UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ticket_id)
);

ALTER TABLE ticket_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY ticket_reads_all ON ticket_reads FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON ticket_reads TO authenticated;

-- ── unread_message_count() ────────────────────────────────────
-- Number of messages the caller hasn't seen: authored by someone else and
-- newer than their last_read_at for that ticket. SECURITY INVOKER (default),
-- so RLS on support_messages applies — a normal user never counts internal
-- notes, and only sees messages on their own tickets; an admin sees all.
CREATE OR REPLACE FUNCTION unread_message_count()
RETURNS INTEGER LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT count(*)::int
  FROM support_messages m
  WHERE m.author_id <> auth.uid()
    AND m.created_at > COALESCE(
      (SELECT r.last_read_at FROM ticket_reads r
        WHERE r.user_id = auth.uid() AND r.ticket_id = m.ticket_id),
      '-infinity'::timestamptz
    )
$$;

GRANT EXECUTE ON FUNCTION unread_message_count() TO authenticated;
