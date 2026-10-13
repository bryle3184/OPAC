import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client using the SERVICE ROLE key.
 *
 * Only import this in `app/api/**` route handlers and other server code —
 * never in a client component, or the service key ships to the browser.
 *
 * Why this exists: `user_profiles` deliberately has no authenticated
 * insert/update/delete policy (a policy letting patrons update their own row
 * would let them promote themselves to admin). Role changes and profile
 * management therefore have to happen with the owner's rights, i.e. through
 * a server endpoint that holds the service role.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables (service role).');
  }
  return createClient(url, key);
}