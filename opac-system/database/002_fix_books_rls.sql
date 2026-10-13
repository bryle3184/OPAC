-- OPAC migration 002: restore public read access to the catalog
--
-- Symptom: /browse showed "No books found in the catalog." and anon-key
-- queries returned 0 rows with no error, even though the books table holds data.
--
-- Cause: Row Level Security was enabled on public.books with ZERO policies.
-- With RLS on and no matching policy, Postgres filters every row out and
-- reports success, so the client sees an empty result set rather than an error.
-- The matching policy defined in database/schema.sql was never applied.
--
-- Fix: re-create the intended permissive read policy.

DROP POLICY IF EXISTS "Books are viewable by everyone" ON public.books;

CREATE POLICY "Books are viewable by everyone" ON public.books
    FOR SELECT
    TO anon, authenticated
    USING (true);