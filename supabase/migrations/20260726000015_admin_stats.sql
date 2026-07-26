-- ============================================================
-- Admin analytics
-- ============================================================
-- Aggregates for the dashboard. Derived from existing tables + the audit_log
-- time series (signups/sessions/tickets/active users), so no separate events
-- table is needed. All SECURITY DEFINER + is_admin()-guarded.

-- ── headline totals ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_stats_totals()
RETURNS TABLE (users INT, sessions INT, public_sessions INT, open_tickets INT, storage_bytes BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY SELECT
    (SELECT count(*)::int FROM profiles),
    (SELECT count(*)::int FROM sessions),
    (SELECT count(*)::int FROM sessions WHERE is_public),
    (SELECT count(*)::int FROM support_tickets WHERE status IN ('open', 'in_progress')),
    COALESCE((
      SELECT sum((o.metadata->>'size')::bigint)
      FROM storage.objects o WHERE o.bucket_id = 'session-files'
    ), 0)::bigint;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_stats_totals() TO authenticated;

-- ── daily activity (last N days, zero-filled) ─────────────────
CREATE OR REPLACE FUNCTION admin_daily_counts(p_days INT DEFAULT 30)
RETURNS TABLE (day DATE, signups INT, sessions INT, tickets INT, active INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  WITH d AS (
    SELECT generate_series(current_date - (p_days - 1), current_date, interval '1 day')::date AS day
  )
  SELECT
    d.day,
    count(*) FILTER (WHERE a.action = 'user.signup')::int,
    count(*) FILTER (WHERE a.action = 'session.create')::int,
    count(*) FILTER (WHERE a.action = 'ticket.create')::int,
    count(DISTINCT a.actor_id)::int
  FROM d
  LEFT JOIN audit_log a ON a.created_at::date = d.day
  GROUP BY d.day
  ORDER BY d.day;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_daily_counts(INT) TO authenticated;

-- ── top circuits by session count ─────────────────────────────
CREATE OR REPLACE FUNCTION admin_top_circuits(p_limit INT DEFAULT 8)
RETURNS TABLE (circuit TEXT, sessions INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
  SELECT COALESCE(s.circuit_name, s.venue_raw, 'Unknown'), count(*)::int
  FROM sessions s
  GROUP BY COALESCE(s.circuit_name, s.venue_raw, 'Unknown')
  ORDER BY count(*) DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_top_circuits(INT) TO authenticated;
