import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { requireAdmin } from '@/app/api/admin/_auth';

/**
 * GET  /api/admin/loans — list every loan with book title + borrower name.
 * PUT  /api/admin/loans — change a loan's status.
 * DELETE /api/admin/loans — permanently remove a loan.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  const admin = createAdminClient();

  const { data: loanData, error } = await admin
    .from('loans')
    .select('id, book_id, user_id, checkout_date, due_date, returned_at, status, fine_amount, fine_paid, created_at, updated_at, book:books(title)')
    .order('checkout_date', { ascending: false });

  if (error) {
    console.error('Admin loans list error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // Attach borrower names in one batch (service role bypasses RLS).
  if (loanData && loanData.length > 0) {
    const userIds = [...new Set(loanData.map((l: any) => l.user_id))];
    const { data: usersData } = await admin
      .from('user_profiles')
      .select('id, name')
      .in('id', userIds);

    const userMap = new Map<string, { id: string; name: string | null }>();
    if (usersData) {
      for (const u of usersData) userMap.set(u.id, u);
    }

    for (const l of loanData) {
      const u = userMap.get(l.user_id);
      (l as any).user_name = u?.name || '—';
    }
  }

  return NextResponse.json({ success: true, loans: loanData ?? [] });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => null);
  const { id, status } = body ?? {};
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing loan id' }, { status: 400 });
  }
  if (!['active', 'returned', 'overdue'].includes(status)) {
    return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
  }

  const admin = createAdminClient();
  const update: any = { status, updated_at: new Date().toISOString() };
  if (status === 'returned') {
    update.returned_at = new Date().toISOString();
  }

  const { data, error } = await admin
    .from('loans')
    .update(update)
    .eq('id', id)
    .select('id, book_id, user_id, checkout_date, due_date, returned_at, status, fine_amount, fine_paid, created_at, updated_at, book:books(title)')
    .single();

  if (error) {
    console.error('Admin loan update error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, loan: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing loan id' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('loans').delete().eq('id', id);

  if (error) {
    console.error('Admin loan delete error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}