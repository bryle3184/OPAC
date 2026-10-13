"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/account');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if (error) throw error;

      // Email confirmation is enabled on this project (mailer_autoconfirm is
      // false), so signUp returns a user but NO session - the account cannot be
      // used until the emailed link is followed. Redirecting as if signed in
      // makes a successful signup look like a failure.
      if (data.session) {
        router.push('/account');
        return;
      }

      const alreadyRegistered =
        !!data.user &&
        Array.isArray(data.user.identities) &&
        data.user.identities.length === 0;

      setMode('login');
      setShowResend(true);

      if (alreadyRegistered) {
        setNotice(
          `An account for ${email} already exists. If you have not confirmed it yet, ` +
            `resend the confirmation email below - otherwise just sign in.`
        );
      } else {
        setNotice(
          `Account created. A confirmation link was sent to ${email}. You must open ` +
            `that link before you can sign in.`
        );
      }
    } catch (err: any) {
      const message = err.message || 'Authentication failed';
      setError(message);
      if (/email not confirmed/i.test(message)) {
        setShowResend(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setNotice(null);
    setIsResending(true);

    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      setNotice(
        `Confirmation email re-sent to ${email}. Check your inbox and your spam folder.`
      );
    } catch (err: any) {
      setError(err.message || 'Could not resend the confirmation email');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-md p-8 shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {notice && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-4">
            {notice}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          {mode === 'signup' && (
            <div className="space-y-2">
              <label htmlFor="fullname" className="block text-sm font-medium text-gray-700">Full name</label>
              <input
                id="fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {showResend && (
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || !email}
            className="mt-4 w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {isResending ? 'Sending...' : 'Resend confirmation email'}
          </button>
        )}

        <div className="mt-6 text-center text-sm text-gray-600">
          <span>{mode === 'login' ? "Don't have an account? " : 'Already have an account? '}</span>
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setNotice(null); }}
            className="underline text-blue-600 hover:text-blue-800 transition-colors"
          >
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
