import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Ensures the request comes from a signed-in admin.
 *
 * Reads the access token from the `Authorization: Bearer <token>` header.
 * This is used instead of cookies because Supabase stores sessions in
 * `localStorage` on the client, and the browser does not automatically
 * forward localStorage values to server-side API requests.
 *
 * The client-side fetch calls in `app/admin/page.tsx` send the token via
 * `Authorization` header by reading it from the session.
 *
 * Returns the user id on success, or a 401/403 NextResponse on failure.
 */
export async function requireAdmin(request: NextRequest): Promise<{
  user: { id: string } | null;
  response: NextResponse | null;
}> {
  const authHeader = request.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1];

  if (!token) {
    return { user: null, response: NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 }) };
  }

  // Verify the token with the Supabase Auth API. getUser(jwt) calls
  // /auth/v1/user and applies the SDK's own response transform, so we don't
  // have to guess the raw JSON shape.
  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error: authError } = await authClient.auth.getUser(token);
  const user = data?.user;

  if (authError || !user) {
    return { user: null, response: NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 }) };
  }

  // Check role using service role client
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: roleData, error: roleError } = await serviceClient
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (roleError || !roleData || roleData.role !== 'admin') {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 },
      ),
    };
  }

  return { user: { id: user.id }, response: null };
}