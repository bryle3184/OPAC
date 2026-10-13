import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Ensures the request comes from a signed-in user.
 *
 * Reads the access token from the `Authorization: Bearer <token>` header.
 * This is used instead of cookies because Supabase stores sessions in
 * `localStorage` on the client, and the browser does not automatically
 * forward localStorage values to server-side API requests.
 *
 * The client-side fetch calls in `app/account/page.tsx` send the token via
 * the `Authorization` header by reading it from the session.
 *
 * Returns the user id on success, or a 401 NextResponse on failure.
 */
export async function requireAuth(request: NextRequest): Promise<{
  user: { id: string; email: string } | null;
  token: string | null;
  response: NextResponse | null;
}> {
  const authHeader = request.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1];

  if (!token) {
    return {
      user: null,
      token: null,
      response: NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 }),
    };
  }

  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error: authError } = await authClient.auth.getUser(token);
  const user = data?.user;

  if (authError || !user) {
    return {
      user: null,
      token: null,
      response: NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 }),
    };
  }

  return { user: { id: user.id, email: user.email! }, token, response: null };
}