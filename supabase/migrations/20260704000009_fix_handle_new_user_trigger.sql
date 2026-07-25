-- Migration 0008 mistakenly added a user_settings INSERT to handle_new_user(),
-- which conflicts with the existing on_auth_user_created_settings trigger that
-- calls handle_new_user_settings(). The second INSERT has no ON CONFLICT clause
-- and throws a PK violation, causing sign-up to fail with a cryptic {} error.
--
-- Fix: remove user_settings from handle_new_user() — it has its own trigger.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (
    NEW.id,
    NULLIF(trim(NEW.raw_user_meta_data->>'username'), '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
