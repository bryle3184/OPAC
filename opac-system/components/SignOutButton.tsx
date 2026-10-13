'use client';

import { supabase } from '@/lib/supabase';

/**
 * The account page signs out via the Supabase client SDK. The admin layout
 * previously used a plain `<a href="/api/auth/signout">`, but no such route
 * exists — it 404'd. This button does the same thing the account page does.
 */
export default function SignOutButton() {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <button
      onClick={handleSignOut}
      className="text-sm text-red-600 hover:text-red-800 transition-colors bg-transparent border-0 cursor-pointer"
    >
      Sign Out
    </button>
  );
}