-- Prevent locking everyone out of /admin: block demoting or deleting the last
-- remaining admin. (Self-delete is already blocked separately.)

CREATE OR REPLACE FUNCTION admin_set_role(target_id UUID, new_role TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF new_role NOT IN ('user', 'admin') THEN RAISE EXCEPTION 'Invalid role'; END IF;

  IF new_role = 'user'
     AND (SELECT role FROM profiles WHERE id = target_id) = 'admin'
     AND (SELECT count(*) FROM profiles WHERE role = 'admin') <= 1 THEN
    RAISE EXCEPTION 'Cannot demote the last admin';
  END IF;

  UPDATE profiles SET role = new_role WHERE id = target_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_delete_user(target_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF target_id = auth.uid() THEN RAISE EXCEPTION 'You cannot delete your own account here'; END IF;

  IF (SELECT role FROM profiles WHERE id = target_id) = 'admin'
     AND (SELECT count(*) FROM profiles WHERE role = 'admin') <= 1 THEN
    RAISE EXCEPTION 'Cannot delete the last admin';
  END IF;

  DELETE FROM auth.users WHERE id = target_id;
END;
$$;
