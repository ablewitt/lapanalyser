-- ============================================================
-- Admin role foundation
-- ============================================================
-- Adds a `role` to profiles, an is_admin() helper (SECURITY DEFINER,
-- so it bypasses RLS and cannot cause the recursion we hit with
-- sessions ↔ session_shares), and a guard preventing users from
-- escalating their own role.

-- ── role column ───────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

-- ── is_admin(): the single source of truth for admin checks ───
-- SECURITY DEFINER + STABLE, reads profiles with RLS bypassed.
-- Every admin-bypass policy MUST call this rather than sub-querying
-- profiles directly, or RLS recursion returns.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  )
$$;

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- ── Prevent self-escalation ───────────────────────────────────
-- profiles_update lets a user update their own row (id = auth.uid()).
-- Without this, they could set their own role to 'admin'. Reject any
-- change to role unless the caller is already an admin.
CREATE OR REPLACE FUNCTION guard_profile_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins may change a profile role';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_profile_role
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION guard_profile_role();
