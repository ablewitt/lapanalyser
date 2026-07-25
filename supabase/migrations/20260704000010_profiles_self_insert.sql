-- Allow a user to insert their own profile row (safety net if the trigger misfired).
CREATE POLICY profiles_insert ON profiles FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid());
