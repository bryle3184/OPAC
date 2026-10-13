"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Book, Clock, AlertCircle, Pencil, Save, X } from 'lucide-react';
import { format } from 'date-fns';

interface Profile {
  id: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  date_of_birth: string | null;
  library_card_number: string;
  role: string;
}

interface AccountData {
  profile: Profile;
  email: string;
  loans: any[];
  reservations: any[];
}

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<AccountData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', address: '', date_of_birth: '' });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    async function loadUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        try {
          async function jsonOrEmpty(res: Response) {
            if (!res.ok || res.headers.get('content-type')?.includes('application/json') === false) return null;
            return res.json().catch(() => null);
          }
          // getSession() returns the current session (including access_token)
          // so we can send it as Authorization: Bearer for server-side routes.
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          const headers: Record<string, string> = {};
          if (token) headers.Authorization = `Bearer ${token}`;

          const [profileData, loansData, reservData] = await Promise.all([
            jsonOrEmpty(await fetch('/api/account', { headers })),
            jsonOrEmpty(await fetch('/api/account/loans', { headers })),
            jsonOrEmpty(await fetch('/api/account/reservations', { headers })),
          ]);

          if (profileData?.success && profileData.profile) {
            setEditForm({
              name: profileData.profile.name || '',
              phone: profileData.profile.phone || '',
              address: profileData.profile.address || '',
              date_of_birth: profileData.profile.date_of_birth || '',
            });
          }

          setData({
            profile: profileData?.profile || { id: user.id, name: null, phone: null, address: null, date_of_birth: null, library_card_number: '', role: 'patron' },
            email: user.email!,
            loans: loansData?.success ? (loansData.loans || []) : [],
            reservations: reservData?.success ? (reservData.reservations || []) : [],
          });
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
      setIsLoading(false);
    }

    loadUserData();
  }, []);

  const handleEdit = () => setIsEditing(true);
  const handleCancel = () => {
    setIsEditing(false);
    if (data?.profile) {
      setEditForm({
        name: data.profile.name || '',
        phone: data.profile.phone || '',
        address: data.profile.address || '',
        date_of_birth: data.profile.date_of_birth || '',
      });
    }
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    setSaveMessage('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/account', {
        method: 'PUT',
        headers,
        body: JSON.stringify(editForm),
      });
      const result = await res.json();
      if (result.success && result.profile) {
        setData(prev => prev ? { ...prev, profile: result.profile } : prev);
        setIsEditing(false);
        setSaveStatus('saved');
        setSaveMessage('Profile updated successfully');
      } else {
        setSaveStatus('error');
        setSaveMessage(result.error || 'Failed to update profile');
      }
    } catch {
      setSaveStatus('error');
      setSaveMessage('Network error');
    }
  };

  const handleReturnLoan = async (loanId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/account/loans', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id: loanId }),
      });
      const result = await res.json();
      if (res.ok && result.success && result.loan) {
        setData(prev => prev ? {
          ...prev,
          loans: prev.loans.map((l: any) =>
            l.id === loanId ? result.loan : l
          ),
        } : prev);
      } else {
        alert(result.error || 'Failed to return book');
      }
    } catch {
      alert('Network error');
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    // existing code unchanged
  };

  // Book Now: create a loan from a ready reservation
  const handleBookNow = async (reservation: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const bookId = reservation.book_id ?? reservation.book?.id;
      console.log('Reservation data', reservation);


      console.log('bookId', bookId);

      if (!bookId) {
        alert('Unable to determine book ID for reservation');
        return;
      }
      const loanRes = await fetch('/api/account/loans', {
        method: 'POST',
        headers,
        body: JSON.stringify({ book_id: String(bookId) }),
      });
      if (!loanRes.ok) {
        const err = await loanRes.json().catch(() => ({}));
        alert(err.error || `Failed to create loan (status ${loanRes.status})`);
        return;
      }

      const loanResult = await loanRes.json();
      if (loanResult.success && loanResult.loan) {
        // Delete reservation after booking
        await fetch(`/api/account/reservations?id=${reservation.id}`, {
          method: 'DELETE',
          headers,
        }).catch(() => {});
        // Optimistically update UI: add loan and remove reservation
        setData(prev => prev ? {
          ...prev,
          loans: [...prev.loans, loanResult.loan],
          reservations: prev.reservations.filter((r: any) => r.id !== reservation.id),
        } : prev);
      } else {
        alert(loanResult.error || 'Failed to book the reservation');
      }
    } catch {
      alert('Network error');
    }
  };
    
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading your account...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Not Signed In</h2>
        <p className="text-gray-600 mb-6">Please sign in to view your account details.</p>
        <button onClick={() => { window.location.href = '/login'; }} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
          Sign In
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load account data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Profile Card */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-1 text-gray-900">My Account</h1>
            <p className="text-gray-600">Logged in as: {data.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-red-600 hover:underline"
          >
            Sign Out
          </button>
        </div>

        <div className="border-t pt-4 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
              <User className="h-5 w-5 text-gray-500" />
              Profile Information
            </h2>
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={saveStatus === 'saving'}
                  className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saveStatus === 'saving' ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </div>
            )}
          </div>

          {saveMessage && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              saveStatus === 'saved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {saveMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">{data.profile.name || 'Not set'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <p className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">{data.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">{data.profile.phone || 'Not set'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              {isEditing ? (
                <input
                  type="date"
                  value={editForm.date_of_birth}
                  onChange={e => setEditForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                  {data.profile.date_of_birth ? format(new Date(data.profile.date_of_birth), 'MMM d, yyyy') : 'Not set'}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              {isEditing ? (
                <textarea
                  value={editForm.address}
                  onChange={e => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">{data.profile.address || 'Not set'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Library Card</label>
              <p className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">{data.profile.library_card_number}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <p className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900 capitalize">{data.profile.role}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Book className="h-5 w-5" /> Current Loans
          </h2>
          {data.loans.length === 0 ? (
            <p className="text-gray-500 bg-gray-50 p-4 rounded-lg">You have no active loans.</p>
          ) : (
            <div className="space-y-4">
              {data.loans.map((loan: any) => (
                <div key={loan.id} className="bg-white p-4 rounded-lg border border-gray-200 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-900">{loan.book?.title || 'Unknown Book'}</h3>
                    <p className="text-sm text-gray-500">Checked out: {format(new Date(loan.checkout_date), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className={`text-sm font-medium ${new Date(loan.due_date) < new Date() ? 'text-red-600' : 'text-blue-600'}`}>
                        Due: {format(new Date(loan.due_date), 'MMM d, yyyy')}
                      </p>
                      <span className="text-xs uppercase bg-green-500 text-white px-2 py-1 rounded mt-1 inline-block">{loan.status}</span>
                    </div>
                    {loan.status === 'active' && (
                      <button
                        onClick={() => handleReturnLoan(loan.id)}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Return
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Clock className="h-5 w-5" /> Reservations
          </h2>
          {data.reservations.length === 0 ? (
            <p className="text-gray-500 bg-gray-50 p-4 rounded-lg">You have no active reservations.</p>
          ) : (
            <div className="space-y-4">
              {data.reservations.map((res: any) => (
                <div key={res.id} className="bg-white p-4 rounded-lg border border-gray-200 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{res.book?.title || 'Unknown Book'}</h3>
                    <p className="text-sm text-gray-500">Reserved: {format(new Date(res.reservation_date), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-purple-600">
                      Status: {res.status}
                    </span>
                    {res.status === 'pending' && (
                      <button
                        onClick={() => handleCancelReservation(res.id)}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Cancel
                      </button>
                    )}
                    {res.status === 'ready' && (
                      <button
                        onClick={() => handleBookNow(res)}
                        className="text-sm text-green-600 hover:text-green-700 font-medium"
                      >
                        Book Now
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
