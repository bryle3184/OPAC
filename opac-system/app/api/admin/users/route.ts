import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { requireAdmin } from '@/app/api/admin/_auth';

/**
 * GET  /api/admin/users — list every profile (id, role, active, card number).
 * PUT  /api/admin/users — change a user's role and/or active flag.
 *
 * Role changes go through the service-role client because `user_profiles`
 * deliberately has no authenticated write policy (see migration 003): a
 * policy letting patrons update their own row would let them promote
 * themselves. Only an admin, re-verified by requireAdmin(), can reach this.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('user_profiles')
    .select('id, library_card_number, name, role, is_active, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Users list error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, users: data ?? [] });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => null);
  const { id, role, is_active } = body ?? {};
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing user id' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (role !== undefined) {
    if (!['patron', 'librarian', 'admin'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
    }
    update.role = role;
  }
  if (is_active !== undefined) {
    update.is_active = Boolean(is_active);
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ success: false, error: 'Nothing to update' }, { status: 400 });
  }

  // An admin cannot demote themselves — prevents locking the last admin out.
  if (auth.user && id === auth.user.id && update.role && update.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Cannot change your own admin role' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('user_profiles')
    .update(update)
    .eq('id', id)
    .select('id, library_card_number, name, role, is_active')
    .single();

  if (error) {
    console.error('User update error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, user: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing user id' }, { status: 400 });
  }

  // Prevent admin from deleting themselves
  if (auth.user && id === auth.user.id) {
    return NextResponse.json({ success: false, error: 'Cannot delete your own account' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('user_profiles').delete().eq('id', id);

  if (error) {
    console.error('User delete error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}