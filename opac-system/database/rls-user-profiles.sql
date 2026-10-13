-- RLS policies for user_profiles
-- Run this in your Supabase SQL Editor to unlock profile access for authenticated users.

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile (non-role fields)"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      NEW.name = OLD.name
      AND NEW.phone = OLD.phone
      AND NEW.address = OLD.address
      AND NEW.date_of_birth = OLD.date_of_birth
      AND NEW.role = OLD.role
    )
  );

CREATE POLICY "Librarians can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    auth.jwt() ->> 'role' IN ('librarian', 'admin')
  );
