-- OPAC migration 003: user profiles, roles, and the admin gate
--
-- Why: app/admin/page.tsx authorises on user_profiles.role, but that table was
-- never created, so no account could ever hold a role and the page could never
-- be entered. schema.sql declares the table and enables RLS on it, but defines
-- no policies for it - created verbatim it would return zero rows with no error,
-- the same trap that made /browse look empty.

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  library_card_number VARCHAR(50) UNIQUE NOT NULL,
  name TEXT,
  phone VARCHAR(20),
  address TEXT,
  date_of_birth DATE,
  role VARCHAR(20) NOT NULL DEFAULT 'patron' CHECK (role IN ('patron', 'librarian', 'admin')),
  membership_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  membership_end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- updated_at maintenance (schema.sql's helper is not present on the live DB)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: a signed-in user may read their own profile row, and nothing else.
--
-- Deliberately NO insert/update/delete policy for `authenticated`: a policy
-- letting users update their own row would let any patron set role='admin' and
-- promote themselves. Profiles are created by the SECURITY DEFINER trigger
-- below; role changes are made with the service role or as the table owner.
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Role helpers.
--
-- These are SECURITY DEFINER on purpose: a policy that reads the table it guards
-- recurses under RLS, so `is_staff()` must read user_profiles with the owner's
-- rights rather than the caller's.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(public.current_user_role() IN ('librarian', 'admin'), false);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(public.current_user_role() = 'admin', false);
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Every new auth user gets a profile with the default 'patron' role.
-- The card number is derived from the user id so it cannot collide with the
-- UNIQUE constraint (a collision here would abort the signup).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, name, library_card_number, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'OPAC-' || upper(substr(replace(NEW.id::text, '-', ''), 1, 8)),
    'patron'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill any accounts that already exist.
INSERT INTO public.user_profiles (id, name, library_card_number, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  'OPAC-' || upper(substr(replace(u.id::text, '-', ''), 1, 8)),
  'patron'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- Replace schema.sql's staff predicates on `books`.
--
-- Those read auth.jwt() ->> 'role', which is the Postgres role claim
-- ('authenticated'), never the app role - so no librarian or admin could ever
-- satisfy them. Only staff policies are touched; the public SELECT policy that
-- /browse depends on is left alone.
DROP POLICY IF EXISTS "Books can be inserted by librarians and admins" ON public.books;
CREATE POLICY "Books can be inserted by librarians and admins" ON public.books
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Books can be updated by librarians and admins" ON public.books;
CREATE POLICY "Books can be updated by librarians and admins" ON public.books
  FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Books can be deleted by admins only" ON public.books;
CREATE POLICY "Books can be deleted by admins only" ON public.books
  FOR DELETE TO authenticated
  USING (public.is_admin());