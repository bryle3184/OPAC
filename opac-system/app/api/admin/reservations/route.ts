import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { requireAdmin } from '@/app/api/admin/_auth';

/**
 * GET  /api/admin/reservations — list every reservation with book title.
 * PUT  /api/admin/reservations — change a reservation's status.
 * DELETE /api/admin/reservations — permanently remove a reservation.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  const admin = createAdminClient();

  // Fetch reservations with book title (books is public, no RLS issue)
  const { data: resData, error } = await admin
    .from('reservations')
    .select('id, book_id, user_id, reservation_date, status, expires_at, created_at, book:books(title)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Admin reservations list error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // Fetch user emails in one batch (service role bypasses RLS)
  if (resData && resData.length > 0) {
    const userIds = [...new Set(resData.map(r => r.user_id))];
    const { data: usersData } = await admin
      .from('user_profiles')
      .select('id, name')
      .in('id', userIds);

    // Build a lookup: user_id -> user info
    const userMap = new Map<string, { id: string; name: string | null }>();
    if (usersData) {
      for (const u of usersData) userMap.set(u.id, u);
    }

    // Attach user info to each reservation
    for (const r of resData) {
      const u = userMap.get(r.user_id);
      (r as any).user_name = u?.name || '—';
    }
  }

  return NextResponse.json({ success: true, reservations: resData ?? [] });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => null);
  const { id, status } = body ?? {};
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing reservation id' }, { status: 400 });
  }
  if (!['pending', 'ready', 'cancelled', 'expired'].includes(status)) {
    return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('reservations')
    .update({ status })
    .eq('id', id)
    .select('id, book_id, user_id, reservation_date, status, expires_at, created_at, book:books(title)')
    .single();

  if (error) {
    console.error('Admin reservation update error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, reservation: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing reservation id' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('reservations').delete().eq('id', id);

  if (error) {
    console.error('Admin reservation delete error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}