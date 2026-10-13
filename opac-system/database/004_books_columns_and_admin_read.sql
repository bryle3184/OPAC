-- OPAC migration 004: books copy columns + admin read on user_profiles
--
-- Why: two gaps that block the admin page end-to-end.
--
-- 1. `books.copies_available` / `books.total_copies` do not exist on the live
--    table (the import script never created them). The admin catalog table and
--    the BookCard availability badge both read those columns, so every row
--    renders "— / —". Backfill from the live data: total_copies = 1 (the
--    default the import assumed), copies_available = 1 unless a loan is open.
--
-- 2. `user_profiles` has a SELECT policy allowing a user to read only their
--    OWN row. The admin page needs to list every profile, so staff need a
--    separate policy. Deliberately NOT writable: a policy letting staff
--    insert/update profiles would let any librarian create admin accounts.

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS copies_available INTEGER,
  ADD COLUMN IF NOT EXISTS total_copies INTEGER;

-- Backfill existing rows before enforcing NOT NULL.
UPDATE public.books
SET total_copies = COALESCE(total_copies, 1),
    copies_available = COALESCE(copies_available, 1);

ALTER TABLE public.books
  ALTER COLUMN total_copies SET NOT NULL,
  ALTER COLUMN total_copies SET DEFAULT 1,
  ALTER COLUMN copies_available SET NOT NULL,
  ALTER COLUMN copies_available SET DEFAULT 1;

-- Staff (librarian/admin) can read every profile for user management.
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.user_profiles;
CREATE POLICY "Staff can view all profiles" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (public.is_staff());