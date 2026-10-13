"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, catalogService, Book } from '@/lib/supabase';
import { User as SupaUser } from '@supabase/supabase-js';
import { Settings, Users, Book as BookIcon, AlertTriangle, Plus, Edit2, Trash2, X, Check, Eye } from 'lucide-react';

interface AdminUser {
  id: string;
  library_card_number: string;
  name: string | null;
  role: 'patron' | 'librarian' | 'admin';
  is_active: boolean;
  created_at: string;
}

type Tab = 'catalog' | 'users' | 'reservations' | 'loans';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<SupaUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('catalog');

  // Catalog state
  const [books, setBooks] = useState<Book[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bookForm, setBookForm] = useState<Partial<Book>>({});
  const [bookError, setBookError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // User management state
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  // Reservations state
  const [reservations, setReservations] = useState<any[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  // Loans state
  const [loans, setLoans] = useState<any[]>([]);
  const [loansLoading, setLoansLoading] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          setRoleError(error.message);
        } else if (data && (data.role === 'admin' || data.role === 'librarian')) {
          setIsAdmin(true);
          // store access token for later API calls
          const { data: { session } } = await supabase.auth.getSession();
          setAccessToken(session?.access_token ?? null);
          try {
            const allBooks = await catalogService.getAllBooks();
            setBooks(allBooks);
            await loadUsers();
          } catch (err: any) {
            setRoleError(err?.message || 'Failed to load the catalog');
          }
        }
      }
      setIsLoading(false);
    }
    checkAdmin();
  }, []);

  async function loadUsers() {
    setUsersLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/admin/users', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load users');
      setAdminUsers(data.users ?? []);
    } catch (err: any) {
      setRoleError(err.message);
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin || tab !== 'users') return;
    loadUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, tab]);

  useEffect(() => {
    if (!isAdmin || tab !== 'reservations') return;
    loadReservations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, tab]);

  useEffect(() => {
    if (!isAdmin || tab !== 'loans') return;
    loadLoans();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, tab]);

  async function saveBook(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setBookError(null);

    // Get the current session token to send in the Authorization header
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    try {
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch('/api/admin/books', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': accessToken ? `Bearer ${accessToken}` : '',
        },
        body: JSON.stringify(bookForm),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errData.error || 'Request failed');
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to save book');

      if (editingId) {
        setBooks((prev) => prev.map((b) => (b.id === editingId ? data.book : b)));
      } else {
        setBooks((prev) => [...prev, data.book].sort((a, b) => a.title.localeCompare(b.title)));
      }
      setShowForm(false);
      setEditingId(null);
      setBookForm({});
    } catch (err: any) {
      setBookError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteBook(id: string) {
    if (!confirm('Delete this book? This cannot be undone.')) return;
    // Always fetch a fresh session token — the `accessToken` state captured at
    // page load goes stale and the server rejects it with 401.
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      console.warn('No access token available for delete');
      alert('Not signed in. Please refresh the page and try again.');
      return;
    }
    try {
      const res = await fetch('/api/admin/books', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });
      console.log('Delete response status:', res.status);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errData.error || 'Request failed');
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setBooks((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function updateUser(userId: string, updates: Partial<AdminUser>) {
  // Get the current session token
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  try {
    const res = await fetch('/api/admin/users', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': accessToken ? `Bearer ${accessToken}` : '',
      },
      body: JSON.stringify({ id: userId, ...updates }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(errData.error || 'Request failed');
    }
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    setAdminUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...data.user } : u))
    );
  } catch (err: any) {
    alert(err.message);
  }
}

async function deleteUser(userId: string) {
  if (!confirm('Delete this user? This cannot be undone.')) return;
  try {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch(`/api/admin/users?id=${userId}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete user');
    setAdminUsers((prev) => prev.filter((u) => u.id !== userId));
  } catch (err: any) {
    alert(err.message);
  }
}

async function loadReservations() {
    setReservationsLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/admin/reservations', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load reservations');
      setReservations(data.reservations ?? []);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setReservationsLoading(false);
    }
  }

  async function updateReservationStatus(reservationId: string, status: string) {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/admin/reservations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ id: reservationId, status }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update reservation');
      setReservations((prev) =>
        prev.map((r) => (r.id === reservationId ? data.reservation : r))
      );
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function deleteReservation(reservationId: string) {
    if (!confirm('Delete this reservation? This cannot be undone.')) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`/api/admin/reservations?id=${reservationId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete reservation');
      setReservations((prev) => prev.filter((r) => r.id !== reservationId));
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function loadLoans() {
    setLoansLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/admin/loans', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load loans');
      setLoans(data.loans ?? []);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoansLoading(false);
    }
  }

  async function updateLoanStatus(loanId: string, status: string) {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/admin/loans', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ id: loanId, status }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update loan');
      setLoans((prev) =>
        prev.map((l) => (l.id === loanId ? data.loan : l))
      );
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function deleteLoan(loanId: string) {
    if (!confirm('Delete this loan? This cannot be undone.')) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`/api/admin/loans?id=${loanId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete loan');
      setLoans((prev) => prev.filter((l) => l.id !== loanId));
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Checking permissions...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-red-700 mb-2">Access Denied</h2>
        {!user ? (
          <>
            <p className="text-red-600 mb-6">You must be signed in as an administrator to view this page.</p>
            <button onClick={() => router.push('/login')} className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition">Sign In</button>
          </>
        ) : roleError ? (
          <>
            <p className="text-red-600 mb-2">Signed in as {user.email}, but your role could not be verified.</p>
            <p className="text-red-500 text-sm font-mono mb-6">{roleError}</p>
          </>
        ) : (
          <p className="text-red-600 mb-6">Signed in as {user.email}. This account does not have the administrator or librarian role.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with dark background for white text */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-xl px-6 py-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Settings className="h-8 w-8 text-white" />
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-blue-200 mt-1">Manage catalog, users, and settings.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <BookIcon className="h-10 w-10 text-blue-500" />
          <div>
            <h3 className="font-bold text-gray-700 text-xl">{books.length}</h3>
            <p className="text-gray-700">Books in Catalog</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <Users className="h-10 w-10 text-green-500" />
          <div>
            <h3 className="font-bold text-gray-700 text-xl">{adminUsers.length}</h3>
            <p className="text-gray-700">Registered Users</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl overflow-hidden border border-blue-200 shadow-sm">
        <nav className="flex">
          <button
            onClick={() => setTab('catalog')}
            className={`flex-1 px-4 py-3 font-semibold transition-colors text-center ${
              tab === 'catalog'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Catalog
          </button>
          <button
            onClick={() => setTab('users')}
            className={`flex-1 px-4 py-3 font-semibold transition-colors text-center ${
              tab === 'users'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setTab('reservations')}
            className={`flex-1 px-4 py-3 font-semibold transition-colors text-center ${
              tab === 'reservations'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Reservations
          </button>
          <button
            onClick={() => setTab('loans')}
            className={`flex-1 px-4 py-3 font-semibold transition-colors text-center ${
              tab === 'loans'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Loans
          </button>
        </nav>
      </div>

      {/* Catalog Tab */}
      {tab === 'catalog' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-gray-900 to-gray-700 px-6 py-4 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
              <h2 className="text-xl font-bold text-white">Catalog Management</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setShowForm(true); setEditingId(null); setBookForm({}); }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" /> Add New Book
                </button>
              </div>
            </div>

            {bookError && (
              <div className="px-6 py-3 bg-red-50 border-b border-red-200 text-red-700 text-sm">{bookError}</div>
            )}

            {/* Add/Edit Form */}
            {showForm && (
              <form onSubmit={saveBook} className="px-6 py-4 border-b border-gray-200 bg-blue-50 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-900">Title *</label>
                    <input
                      type="text"
                      required
                      value={bookForm.title ?? ''}
                      onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-900 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Book title"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-900">Author(s) (comma-separated)</label>
                    <input
                      type="text"
                      value={Array.isArray(bookForm.author) ? bookForm.author.join(', ') : ''}
                      onChange={(e) => setBookForm({ ...bookForm, author: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                      className="w-full px-3 py-2 border border-gray-900 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Harper Lee"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-900">ISBN</label>
                    <input
                      type="text"
                      value={bookForm.isbn ?? ''}
                      onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-900 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="978-..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-900">Format</label>
                    <select
                      value={bookForm.format ?? 'book'}
                      onChange={(e) => setBookForm({ ...bookForm, format: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-900 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="book">Book</option>
                      <option value="ebook">E-Book</option>
                      <option value="audio">Audio Book</option>
                      <option value="periodical">Periodical</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-900">Published Year</label>
                    <input
                      type="number"
                      value={bookForm.published_year ?? ''}
                      onChange={(e) => setBookForm({ ...bookForm, published_year: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-gray-900 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. 2024"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-900">Publisher</label>
                    <input
                      type="text"
                      value={bookForm.publisher ?? ''}
                      onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-900 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-900">Location (Shelf)</label>
                    <input
                      type="text"
                      value={bookForm.location ?? ''}
                      onChange={(e) => setBookForm({ ...bookForm, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-900 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Aisle 3, Shelf B"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-900">Copies Available</label>
                    <input
                      type="number"
                      value={bookForm.copies_available ?? ''}
                      onChange={(e) => setBookForm({ ...bookForm, copies_available: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-gray-900 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. 3"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-900">Total Copies</label>
                    <input
                      type="number"
                      value={bookForm.total_copies ?? ''}
                      onChange={(e) => setBookForm({ ...bookForm, total_copies: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-gray-900 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. 5"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-900">Description</label>
                  <textarea
                    value={bookForm.description ?? ''}
                    onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-900 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Book description..."
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setEditingId(null); setBookForm({}); }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 flex items-center gap-2"
                  >
                    <X className="h-4 w-4" /> Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" /> {saving ? 'Saving...' : editingId ? 'Update Book' : 'Add Book'}
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-100 text-gray-800 text-xs font-semibold uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">Author</th>
                    <th className="px-6 py-3">ISBN</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {books.map((book) => (
                      <tr key={book.id} className="hover:bg-gray-50 transition-colors align-top">
                        <td className="px-6 py-3 font-semibold text-gray-900 whitespace-normal max-w-xs">{book.title}</td>
                        <td className="px-6 py-3 text-gray-800">{book.author.join(', ') || '—'}</td>
                        <td className="px-6 py-3 text-gray-800 font-mono text-xs">{book.isbn || '—'}</td>
                        <td className="px-6 py-3">
                          <button
                            onClick={() => {
                              setEditingId(book.id);
                              setBookForm({ ...book, author: Array.isArray(book.author) ? book.author : [] });
                              setShowForm(true);
                            }}
                            className="text-blue-700 hover:text-blue-900 hover:underline mr-3 flex items-center gap-1 font-medium"
                          >
                            <Edit2 className="h-3 w-3" /> Edit
                          </button>
                          <button
                            onClick={() => deleteBook(book.id)}
                            className="text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1 font-medium"
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  {books.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-700 font-medium">No books found in the catalog.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">User Management</h2>
          </div>
          {usersLoading ? (
            <div className="py-12 text-center text-gray-700 font-medium">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
              <p>Loading users...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-100 text-gray-800 text-xs font-semibold uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Card #</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Active</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {adminUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-semibold text-gray-900">{u.name || '—'}</td>
                      <td className="px-6 py-3 text-gray-800 font-mono">{u.library_card_number}</td>
                      <td className="px-6 py-3">
                        <select
                          value={u.role}
                          onChange={(e) => updateUser(u.id, { role: e.target.value as AdminUser['role'] })}
                          className="px-2 py-1 border rounded text-sm border-gray-900 text-gray-900 focus:outline-none focus:ring-2"
                        >
                          <option value="patron">Patron</option>
                          <option value="librarian">Librarian</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => updateUser(u.id, { is_active: !u.is_active })}
                          className={`px-2 py-1 rounded text-xs font-semibold ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}
                        >
                          {u.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setTab('loans')}
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" /> View Loans
                          </button>
                          <button
                            onClick={() => deleteUser(u.id)}
                            className="text-red-600 hover:text-red-800 hover:underline flex items-center gap-1 font-medium"
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {adminUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-700 font-medium">No users registered yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reservations Tab */}
      {tab === 'reservations' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Reservation Management</h2>
          </div>
          {reservationsLoading ? (
            <div className="py-12 text-center text-gray-700 font-medium">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
              <p>Loading reservations...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-100 text-gray-800 text-xs font-semibold uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3">Book</th>
                    <th className="px-6 py-3">Reserved By</th>
                    <th className="px-6 py-3">Reserved</th>
                    <th className="px-6 py-3">Expires</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {reservations.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-semibold text-gray-900">{r.book?.title || 'Unknown Book'}</td>
                      <td className="px-6 py-3 text-gray-800">{r.user_name || r.user_id?.slice(0, 8) || '—'}</td>
                      <td className="px-6 py-3 text-gray-800">{new Date(r.reservation_date).toLocaleDateString()}</td>
                      <td className="px-6 py-3 text-gray-800">{new Date(r.expires_at).toLocaleDateString()}</td>
                      <td className="px-6 py-3">
                        <select
                          value={r.status}
                          onChange={(e) => updateReservationStatus(r.id, e.target.value)}
                          className="px-2 py-1 border rounded text-sm text-gray-900"
                        >
                          <option value="pending">Pending</option>
                          <option value="ready">Ready</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="expired">Expired</option>
                        </select>
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => deleteReservation(r.id)}
                          className="text-red-600 hover:text-red-800 hover:underline flex items-center gap-1 font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {reservations.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-700 font-medium">No reservations yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Loans Tab */}
      {tab === 'loans' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Loan Management</h2>
          </div>
          {loansLoading ? (
            <div className="py-12 text-center text-gray-700 font-medium">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
              <p>Loading loans...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-100 text-gray-800 text-xs font-semibold uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3">Book</th>
                    <th className="px-6 py-3">Borrowed By</th>
                    <th className="px-6 py-3">Checkout</th>
                    <th className="px-6 py-3">Due</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {loans.map((l: any) => (
                    <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-semibold text-gray-900">{l.book?.title || 'Unknown Book'}</td>
                      <td className="px-6 py-3 text-gray-800">{l.user_name || l.user_id?.slice(0, 8) || '—'}</td>
                      <td className="px-6 py-3 text-gray-800">{new Date(l.checkout_date).toLocaleDateString()}</td>
                      <td className="px-6 py-3 text-gray-800">{new Date(l.due_date).toLocaleDateString()}</td>
                      <td className="px-6 py-3">
                        <select
                          value={l.status}
                          onChange={(e) => updateLoanStatus(l.id, e.target.value)}
                          className="px-2 py-1 border rounded text-sm text-gray-900"
                        >
                          <option value="active">Active</option>
                          <option value="returned">Returned</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => deleteLoan(l.id)}
                          className="text-red-600 hover:text-red-800 hover:underline flex items-center gap-1 font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {loans.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-700 font-medium">No loans yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}