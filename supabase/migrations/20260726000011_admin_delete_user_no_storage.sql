-- Supabase blocks direct DELETE on storage.objects ("Use the Storage API
-- instead"), so admin_delete_user can't clear files itself. Drop that step —
-- the caller removes the user's session files via the Storage API before
-- calling this. The auth.users delete still cascades all DB rows.

CREATE OR REPLACE FUNCTION admin_delete_user(target_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF target_id = auth.uid() THEN RAISE EXCEPTION 'You cannot delete your own account here'; END IF;

  DELETE FROM auth.users WHERE id = target_id;
END;
$$;
