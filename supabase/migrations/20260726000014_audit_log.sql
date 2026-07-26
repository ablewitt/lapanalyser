-- ============================================================
-- Audit log
-- ============================================================
-- Trigger-based so it can't be bypassed by the client, and captures the actor
-- via auth.uid() (or the affected row's owner where auth.uid() isn't set, e.g.
-- sign-up). actor_id/target_id are plain uuids (no FK) so history survives when
-- a user is deleted. Admin-read only; writes come exclusively from the
-- SECURITY DEFINER writer below.

CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id    UUID,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   UUID,
  metadata    JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX audit_log_created_at_idx ON audit_log(created_at DESC);
CREATE INDEX audit_log_actor_idx      ON audit_log(actor_id);
CREATE INDEX audit_log_action_idx     ON audit_log(action);
CREATE INDEX audit_log_target_idx     ON audit_log(target_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Admin-read only. No insert/update/delete policy: only the SECURITY DEFINER
-- writer (owned by postgres, which bypasses RLS) can write.
CREATE POLICY audit_log_select ON audit_log FOR SELECT USING (is_admin());
GRANT SELECT ON audit_log TO authenticated;

-- ── writer ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_audit(
  p_actor UUID, p_action TEXT, p_target_type TEXT, p_target_id UUID, p_metadata JSONB
)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (p_actor, p_action, p_target_type, p_target_id, COALESCE(p_metadata, '{}'::jsonb));
$$;

-- ── sessions: create / delete / visibility ────────────────────
CREATE OR REPLACE FUNCTION audit_session_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(NEW.user_id, 'session.create', 'session', NEW.id,
      jsonb_build_object('filename', NEW.filename, 'circuit', NEW.circuit_name, 'venue', NEW.venue_raw));
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(auth.uid(), 'session.delete', 'session', OLD.id,
      jsonb_build_object('filename', OLD.filename, 'owner', OLD.user_id));
  ELSIF TG_OP = 'UPDATE' AND NEW.is_public IS DISTINCT FROM OLD.is_public THEN
    PERFORM log_audit(auth.uid(), 'session.visibility', 'session', NEW.id,
      jsonb_build_object('is_public', NEW.is_public, 'owner', NEW.user_id));
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_session_ins AFTER INSERT ON sessions FOR EACH ROW EXECUTE FUNCTION audit_session_change();
CREATE TRIGGER trg_audit_session_del AFTER DELETE ON sessions FOR EACH ROW EXECUTE FUNCTION audit_session_change();
CREATE TRIGGER trg_audit_session_upd AFTER UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION audit_session_change();

-- ── session shares: add / remove ──────────────────────────────
CREATE OR REPLACE FUNCTION audit_session_share()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(auth.uid(), 'session.share.add', 'session', NEW.session_id,
      jsonb_build_object('shared_with', NEW.shared_with_user_id));
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(auth.uid(), 'session.share.remove', 'session', OLD.session_id,
      jsonb_build_object('shared_with', OLD.shared_with_user_id));
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_share_ins AFTER INSERT ON session_shares FOR EACH ROW EXECUTE FUNCTION audit_session_share();
CREATE TRIGGER trg_audit_share_del AFTER DELETE ON session_shares FOR EACH ROW EXECUTE FUNCTION audit_session_share();

-- ── profiles: role change ─────────────────────────────────────
CREATE OR REPLACE FUNCTION audit_profile_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    PERFORM log_audit(auth.uid(), 'user.role_change', 'user', NEW.id,
      jsonb_build_object('from', OLD.role, 'to', NEW.role));
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_profile_role AFTER UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION audit_profile_role();

-- ── tickets: create / status change ───────────────────────────
CREATE OR REPLACE FUNCTION audit_ticket_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(NEW.user_id, 'ticket.create', 'ticket', NEW.id,
      jsonb_build_object('subject', NEW.subject, 'category', NEW.category));
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM log_audit(auth.uid(), 'ticket.status', 'ticket', NEW.id,
      jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_ticket_ins AFTER INSERT ON support_tickets FOR EACH ROW EXECUTE FUNCTION audit_ticket_change();
CREATE TRIGGER trg_audit_ticket_upd AFTER UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION audit_ticket_change();

-- ── ticket messages ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION audit_ticket_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM log_audit(NEW.author_id, 'ticket.message', 'ticket', NEW.ticket_id,
    jsonb_build_object('message_id', NEW.id, 'internal', NEW.is_internal));
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_ticket_message AFTER INSERT ON support_messages FOR EACH ROW EXECUTE FUNCTION audit_ticket_message();

-- ── auth.users: sign up / delete ──────────────────────────────
CREATE OR REPLACE FUNCTION audit_user_lifecycle()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(NEW.id, 'user.signup', 'user', NEW.id,
      jsonb_build_object('email', NEW.email));
    RETURN NEW;
  ELSE
    PERFORM log_audit(auth.uid(), 'user.delete', 'user', OLD.id,
      jsonb_build_object('email', OLD.email));
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER trg_audit_user_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION audit_user_lifecycle();
CREATE TRIGGER trg_audit_user_delete AFTER DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION audit_user_lifecycle();
