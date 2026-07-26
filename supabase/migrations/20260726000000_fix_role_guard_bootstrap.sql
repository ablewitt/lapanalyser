-- Fix bootstrap: the role guard blocked even trusted backend contexts
-- (SQL editor, migrations, service role), where auth.uid() is NULL. That
-- made it impossible to create the first admin. Only enforce the guard for
-- real authenticated end-users; a NULL uid is a superuser/service-role
-- caller and is trusted.

CREATE OR REPLACE FUNCTION guard_profile_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL
     AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins may change a profile role';
  END IF;
  RETURN NEW;
END;
$$;
