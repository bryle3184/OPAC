import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/app/api/account/_auth';

/**
 * Build a Supabase client that authenticates as the caller.
 *
 * The module-level `supabase` client uses the anon key with no session, so
 * server-side queries it makes run as `anon` — PostgREST then sees
 * `auth.uid() = NULL` and every RLS policy fails. We must send the caller's
 * access token on each request so PostgREST evaluates RLS as that user.
 */
function clientFor(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
    },
  );
}

/** Default loan period in days. */
const LOAN_DAYS = 14;

export async function GET(request: NextRequest) {
  const { user, response, token } = await requireAuth(request);
  if (response) return response;

  const supabase = clientFor(token!);
  const { data, error } = await supabase
    .from('loans')
    .select('*, book:books(*)')
    .eq('user_id', user!.id)
    .order('due_date', { ascending: true });

  if (error?.code === 'PGRST205') {
    // Table doesn't exist yet — degrade gracefully
    return NextResponse.json({ success: true, loans: [] });
  }
  if (error) {
    console.error('Loans fetch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, loans: data ?? [] });
}

/**
 * POST /api/account/loans — borrow a book.
 *
 * Body: { book_id: string }
 * Creates an active loan with due_date = now + LOAN_DAYS and decrements the
 * book's copies_available. Refuses if the book is checked out or the user
 * already has an active loan for it.
 */
export async function POST(request: NextRequest) {
  const { user, response, token } = await requireAuth(request);
  if (response) return response;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const bookId = body?.book_id;
  if (!bookId || typeof bookId !== 'string') {
    return NextResponse.json({ success: false, error: 'book_id is required' }, { status: 400 });
  }

  const supabase = clientFor(token!);

  // 1. Fetch the book and check availability.
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('id, title, copies_available')
    .eq('id', bookId)
    .single();

  if (bookError || !book) {
    return NextResponse.json({ success: false, error: 'Book not found' }, { status: 404 });
  }
  if (book.copies_available == null || book.copies_available <= 0) {
    return NextResponse.json({ success: false, error: 'This book is currently checked out.' }, { status: 409 });
  }

  // 2. Refuse a duplicate active loan for the same book.
  const { data: existing } = await supabase
    .from('loans')
    .select('id')
    .eq('book_id', bookId)
    .eq('user_id', user!.id)
    .eq('status', 'active')
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { success: false, error: 'You already have this book on loan.' },
      { status: 409 },
    );
  }

  // 3. Create the loan.
  const dueDate = new Date(Date.now() + LOAN_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('loans')
    .insert({ book_id: bookId, user_id: user!.id, due_date: dueDate })
    .select('*, book:books(*)')
    .single();

  if (error) {
    console.error('Loan insert error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // 4. Decrement available copies.
  const { error: updateError } = await supabase
    .from('books')
    .update({ copies_available: book.copies_available - 1 })
    .eq('id', bookId);

  if (updateError) {
    console.error('Book availability update error:', updateError);
  }

  return NextResponse.json({ success: true, loan: data }, { status: 201 });
}

/**
 * PUT /api/account/loans — return a book.
 *
 * Body: { id: string }
 * Sets status to 'returned', records returned_at, and restores copies_available.
 */
export async function PUT(request: NextRequest) {
  const { user, response, token } = await requireAuth(request);
  if (response) return response;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const id = body?.id;
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ success: false, error: 'Loan id is required' }, { status: 400 });
  }

  const supabase = clientFor(token!);

  // Fetch the loan so we can restore the book's availability.
  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .select('id, book_id, status')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single();

  if (loanError || !loan) {
    return NextResponse.json({ success: false, error: 'Loan not found' }, { status: 404 });
  }
  if (loan.status === 'returned') {
    return NextResponse.json({ success: false, error: 'This book has already been returned.' }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('loans')
    .update({ status: 'returned', returned_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, book:books(*)')
    .single();

  if (error) {
    console.error('Loan return error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // Restore one copy.
  const { data: book } = await supabase
    .from('books')
    .select('copies_available')
    .eq('id', loan.book_id)
    .single();

  if (book) {
    await supabase
      .from('books')
      .update({ copies_available: (book.copies_available ?? 0) + 1 })
      .eq('id', loan.book_id);
  }

  return NextResponse.json({ success: true, loan: data });
}