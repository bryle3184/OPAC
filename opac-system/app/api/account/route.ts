import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/app/api/account/_auth';

/**
 * Build a Supabase client that authenticates as the caller.
 *
 * The module-level `supabase` client uses the anon key with no session, so
 * server-side queries it makes run as `anon` — PostgREST then sees
 * `auth.uid() = NULL` and every RLS policy (including the profile policy)
 * fails. We must send the caller's access token on each request so PostgREST
 * evaluates RLS as that user.
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

/**
 * Derive a library card number from the auth user id when the profile row is
 * missing. Mirrors the formula in database/003_user_profiles_and_roles.sql
 * ('OPAC-' || upper(substr(replace(id, '-', ''), 1, 8))).
 */
function deriveLibraryCardNumber(userId: string): string {
  if (!userId) return '';
  return `OPAC-${userId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export async function GET(request: NextRequest) {
  const { user, response, token } = await requireAuth(request);
  if (response) return response;

  const supabase = clientFor(token!);

  // maybeSingle() instead of single(): a user whose profile trigger never ran
  // has no row, and .single() throws PGRST116 -> 500. Return a derived profile
  // so the account page still renders (with a derived card number).
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, name, phone, address, date_of_birth, library_card_number, role')
    .eq('id', user!.id)
    .maybeSingle();

  // Only a real DB error is fatal; a missing row degrades gracefully.
  if (profileError) {
    console.error('Profile fetch error:', profileError);
    return NextResponse.json({ success: false, error: profileError.message }, { status: 500 });
  }

  const resolvedProfile = profile ?? {
    id: user!.id,
    name: null,
    phone: null,
    address: null,
    date_of_birth: null,
    library_card_number: deriveLibraryCardNumber(user!.id),
    role: 'patron',
  };

  return NextResponse.json({ success: true, profile: resolvedProfile, email: user!.email });
}

export async function PUT(request: NextRequest) {
  const { user, response, token } = await requireAuth(request);
  if (response) return response;

  const supabase = clientFor(token!);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const { name, phone, address, date_of_birth } = body;
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (phone !== undefined) update.phone = phone;
  if (address !== undefined) update.address = address;
  if (date_of_birth !== undefined) update.date_of_birth = date_of_birth;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ success: false, error: 'Nothing to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .update(update)
    .eq('id', user!.id)
    .select('id, name, phone, address, date_of_birth, library_card_number, role')
    .single();

  if (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, profile: data });
}