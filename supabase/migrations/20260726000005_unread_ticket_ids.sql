-- Which tickets have messages the caller hasn't seen — for per-ticket unread
-- indicators. Same visibility rules as unread_message_count(): SECURITY
-- INVOKER, so RLS on support_messages applies (internal notes never surface
-- to non-admins). Returns an array so the client gets a plain string[].
CREATE OR REPLACE FUNCTION unread_ticket_ids()
RETURNS UUID[] LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(array_agg(DISTINCT m.ticket_id), '{}')
  FROM support_messages m
  WHERE m.author_id <> auth.uid()
    AND m.created_at > COALESCE(
      (SELECT r.last_read_at FROM ticket_reads r
        WHERE r.user_id = auth.uid() AND r.ticket_id = m.ticket_id),
      '-infinity'::timestamptz
    )
$$;

GRANT EXECUTE ON FUNCTION unread_ticket_ids() TO authenticated;
