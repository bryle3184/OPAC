"use client";

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { catalogService } from '@/lib/supabase';
import type { Book } from '@/lib/supabase';

/**
 * Extracted into its own component so the parent page can wrap it in <Suspense>.
 * useParams() requires this when a sibling route segment is statically generated.
 */
function BookDetailContent() {
  const params = useParams();
  const bookId = params?.id as string;
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reserving, setReserving] = useState(false);
  const [reserveMessage, setReserveMessage] = useState<string | null>(null);
  const [borrowing, setBorrowing] = useState(false);
  const [borrowMessage, setBorrowMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBook() {
      try {
        const data = await catalogService.getBookById(bookId);
        setBook(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load book details');
      } finally {
        setIsLoading(false);
      }
    }
    fetchBook();
  }, [bookId]);

  async function handleBorrow() {
    setBorrowing(true);
    setBorrowMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/account/loans', {
        method: 'POST',
        headers,
        body: JSON.stringify({ book_id: bookId }),
      });
      const result = await res.json().catch(() => null);
      if (res.ok && result?.success) {
        setBorrowMessage('Book borrowed — check My Account to see it.');
      } else {
        setBorrowMessage(result?.error || 'Could not borrow this book. Please try again.');
      }
    } catch {
      setBorrowMessage('Network error — could not borrow this book.');
    } finally {
      setBorrowing(false);
    }
  }

  async function handleReserve() {
    setReserving(true);
    setReserveMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/account/reservations', {
        method: 'POST',
        headers,
        body: JSON.stringify({ book_id: bookId }),
      });
      const result = await res.json().catch(() => null);
      if (res.ok && result?.success) {
        setReserveMessage('Reservation placed — check My Account to see it.');
      } else {
        setReserveMessage(result?.error || 'Could not place reservation. Please try again.');
      }
    } catch {
      setReserveMessage('Network error — could not place reservation.');
    } finally {
      setReserving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading book details...</p>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="space-y-4">
        <Link href="/browse" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
          ← Back to Browse
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Book not found'}
        </div>
      </div>
    );
  }

  const authors = Array.isArray(book.author) ? book.author : [book.author].filter(Boolean);

  return (
    <div className="space-y-6">
      <Link href="/browse" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
        ← Back to Browse
      </Link>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-6">
            {/* Cover */}
            <div className="flex-shrink-0 w-48 h-72 bg-gray-100 rounded flex items-center justify-center border border-gray-200">
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <BookOpen className="h-16 w-16 text-gray-400" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{book.title}</h1>
                {authors.length > 0 && (
                  <p className="text-gray-600 mt-1">
                    {authors.join(', ')}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {book.published_year && (
                  <div>
                    <span className="text-gray-500">Published:</span>
                    <span className="ml-2 text-gray-900">{book.published_year}</span>
                  </div>
                )}
                {book.format && (
                  <div>
                    <span className="text-gray-500">Format:</span>
                    <span className="ml-2 text-gray-900">{book.format}</span>
                  </div>
                )}
                {book.isbn && (
                  <div>
                    <span className="text-gray-500">ISBN:</span>
                    <span className="ml-2 text-gray-900">{book.isbn}</span>
                  </div>
                )}
                {book.publisher && (
                  <div>
                    <span className="text-gray-500">Publisher:</span>
                    <span className="ml-2 text-gray-900">{book.publisher}</span>
                  </div>
                )}
                {book.pages && (
                  <div>
                    <span className="text-gray-500">Pages:</span>
                    <span className="ml-2 text-gray-900">{book.pages}</span>
                  </div>
                )}
                {book.language && (
                  <div>
                    <span className="text-gray-500">Language:</span>
                    <span className="ml-2 text-gray-900">{book.language}</span>
                  </div>
                )}
              </div>

              {book.description && (
                <div className="pt-4 border-t border-gray-100">
                  <h2 className="font-semibold mb-2">Description</h2>
                  <p className="text-gray-700 whitespace-pre-wrap">{book.description}</p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                {typeof book.copies_available === 'number' && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    book.copies_available > 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {(book.copies_available as number) > 0 ? `Available (${book.copies_available})` : 'Checked Out'}
                  </span>
                )}
                <div className="flex flex-col items-end gap-2">
                  {borrowMessage && (
                    <span className={`text-sm flex items-center gap-1 ${
                      borrowMessage.startsWith('Book borrowed') ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {borrowMessage.startsWith('Book borrowed') ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      {borrowMessage}
                    </span>
                  )}
                  {reserveMessage && (
                    <span className={`text-sm flex items-center gap-1 ${
                      reserveMessage.startsWith('Reservation') ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {reserveMessage.startsWith('Reservation') ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      {reserveMessage}
                    </span>
                  )}
                  {(book.copies_available as number) > 0 ? (
                    <button
                      onClick={handleBorrow}
                      disabled={borrowing}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {borrowing ? 'Borrowing...' : 'Borrow Now'}
                    </button>
                  ) : (
                    <button
                      onClick={handleReserve}
                      disabled={reserving}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {reserving ? 'Reserving...' : 'Place Reservation'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Parent page is a static route segment; wrap the client-hook usage in Suspense
// so Next.js can prerender while the dynamic value streams in.
export default function BookDetailPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading book details...</p>
      </div>
    }>
      <BookDetailContent />
    </Suspense>
  );
}
