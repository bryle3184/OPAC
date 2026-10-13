"use client";

import { useState, useEffect } from 'react';
import { catalogService } from '@/lib/supabase';
import { BookCard } from '@/components/BookCard';

export default function BrowsePage() {
  const [books, setBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    async function fetchBooks() {
      try {
        setDebugInfo('Fetching books...');
        const data = await catalogService.getAllBooks();
        setDebugInfo(`Got response: ${JSON.stringify(data?.length ?? 'null')} items`);
        setBooks(data || []);
      } catch (err: any) {
        const msg = err.message || 'Failed to load books from database.';
        setError(msg);
        setDebugInfo(`Error: ${msg} | Code: ${err.code} | Details: ${err.details}`);
        console.error('Browse fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBooks();
  }, []);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Browse Catalog</h1>
        <p className="text-gray-600">
          Explore our complete collection of books and resources.
        </p>
      </div>

      {/* Debug info - remove after fixing */}
      {/* {debugInfo && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-2 rounded text-sm font-mono">
          Debug: {debugInfo}
        </div>
      )} */}

      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading catalog...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-gray-900">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
          {books.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No books found in the catalog.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
