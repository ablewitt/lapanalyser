-- Stream new ticket messages to open threads without a refresh. Realtime
-- respects RLS, so a user's subscription never receives internal admin notes
-- (their support_messages SELECT policy filters is_internal rows out).

ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
