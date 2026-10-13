-- Run this in Supabase SQL Editor to create the missing tables + policies.
-- Simpler policy syntax avoids PostgREST cache bugs with NEW keyword.

-- Loans table
CREATE TABLE IF NOT EXISTS public.loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id BIGINT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkout_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ NOT NULL,
  returned_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'overdue')),
  fine_amount DECIMAL(10, 2) DEFAULT 0.00,
  fine_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loans_user_id ON public.loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_book_id ON public.loans(book_id);
CREATE INDEX IF NOT EXISTS idx_loans_due_date ON public.loans(due_date);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own loans" ON public.loans;
CREATE POLICY "Users can view their own loans" ON public.loans
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Librarians can view all loans" ON public.loans;
CREATE POLICY "Librarians can view all loans" ON public.loans
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "Users can create their own loans" ON public.loans;
CREATE POLICY "Users can create their own loans" ON public.loans
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can return their own loans" ON public.loans;
CREATE POLICY "Users can return their own loans" ON public.loans
  FOR UPDATE TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Librarians can manage all loans" ON public.loans;
CREATE POLICY "Librarians can manage all loans" ON public.loans
  FOR ALL TO authenticated USING (public.is_staff());

-- Reservations table
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id BIGINT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reservation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'cancelled', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  notified_at TIMESTAMPTZ,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON public.reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_book_id ON public.reservations(book_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_expires_at ON public.reservations(expires_at);
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own reservations" ON public.reservations;
CREATE POLICY "Users can view their own reservations" ON public.reservations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own reservations" ON public.reservations;
CREATE POLICY "Users can create their own reservations" ON public.reservations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Librarians can view all reservations" ON public.reservations;
CREATE POLICY "Librarians can view all reservations" ON public.reservations
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "Librarians can manage all reservations" ON public.reservations;
CREATE POLICY "Librarians can manage all reservations" ON public.reservations
  FOR ALL TO authenticated USING (public.is_staff());