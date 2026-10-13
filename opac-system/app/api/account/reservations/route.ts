import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/app/api/account/_auth';

/**
 * Build a Supabase client that authenticates as the caller.
 *
 * The module-level `supabase` client uses the anon key with no session, so
 * server-side queries it makes run as `anon` — PostgREST then sees
 * `auth.uid() = NULL` and every RLS policy (including the reservation
 * INSERT policy) fails. We must send the caller's access token on each
 * request so PostgREST evaluates RLS as that user.
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

export async function GET(request: NextRequest) {
  const { user, response, token } = await requireAuth(request);
  if (response) return response;

  const supabase = clientFor(token!);
  const { data, error } = await supabase
    .from('reservations')
    .select('*, book:books(*)')
    .eq('user_id', user!.id)
    .order('expires_at', { ascending: true });

  if (error?.code === 'PGRST205') {
    // Table doesn't exist yet — degrade gracefully
    return NextResponse.json({ success: true, reservations: [] });
  }
  if (error) {
    console.error('Reservations fetch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, reservations: data ?? [] });
}

/**
 * POST /api/account/reservations — reserve a book.
 *
 * Body: { book_id: string }
 * The schema fills in user_id (from the authenticated caller), status
 * ('pending'), reservation_date (now), and expires_at (now + 7 days).
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

  // Refuse a duplicate reservation for the same book by the same user.
  const { data: existing, error: existingError } = await supabase
    .from('reservations')
    .select('id, status')
    .eq('book_id', bookId)
    .eq('user_id', user!.id)
    .in('status', ['pending', 'ready'])
    .maybeSingle();

  if (existingError) {
    console.error('Reservation lookup error:', existingError);
    return NextResponse.json({ success: false, error: existingError.message }, { status: 500 });
  }
  if (existing) {
    return NextResponse.json(
      { success: false, error: 'You already have a reservation for this book.' },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .from('reservations')
    .insert({ book_id: bookId, user_id: user!.id })
    .select('*, book:books(*)')
    .single();

  if (error) {
    console.error('Reservation insert error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, reservation: data }, { status: 201 });
}

/**
 * PUT /api/account/reservations — cancel a reservation.
 *
 * Body: { id: string, status: 'cancelled' }
 * A patron may only cancel their own reservation, and only to 'cancelled'
 * (the RLS policy enforces this server-side).
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
  const status = body?.status;
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ success: false, error: 'Reservation id is required' }, { status: 400 });
  }
  if (status !== 'cancelled') {
    return NextResponse.json({ success: false, error: 'Only status "cancelled" is allowed' }, { status: 400 });
  }

  const supabase = clientFor(token!);

  const { data, error } = await supabase
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('user_id', user!.id)
    .select('*, book:books(*)')
    .single();

  if (error) {
    console.error('Reservation cancel error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, reservation: data });
}

/**
 * DELETE /api/account/reservations — delete a reservation.
 * Used after a patron successfully books a ready reservation.
 */
export async function DELETE(request: NextRequest) {
  const { user, response, token } = await requireAuth(request);
  if (response) return response;

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing reservation id' }, { status: 400 });
  }

  const supabase = clientFor(token!);
  const { error } = await supabase.from('reservations').delete().eq('id', id).eq('user_id', user!.id);
  if (error) {
    console.error('Reservation delete error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}