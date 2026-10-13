import { Book } from 'lucide-react';
import Link from 'next/link';

interface BookResult {
  id: string;
  title: string;
  author: string[] | string | null;
  isbn: string | null;
  format: string;
  published_year: number | null;
  cover_url: string | null;
  description: string | null;
  copies_available: number | null;
}

/**
 * `author` is declared `text[]` in schema.sql but the live table stores it as a
 * plain text column, so it can arrive as an array, a bare string, or null.
 * Render whichever shape we actually get instead of assuming an array.
 */
function formatAuthors(author: BookResult['author']): string {
  if (Array.isArray(author)) {
    const names = author.filter(Boolean);
    return names.length ? names.join(', ') : 'Unknown';
  }
  return author ? String(author) : 'Unknown';
}

export function BookCard({ book }: { book: BookResult }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-20 h-24 bg-gray-100 rounded flex items-center justify-center">
            {book.cover_url ? (
              <img
                src={book.cover_url}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <Book className="h-10 w-10 text-gray-400" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-2 line-clamp-2">
              {book.title}
            </h3>
            <p className="text-gray-600 text-sm mb-2">
              by {formatAuthors(book.author)}
            </p>
            {book.published_year && (
              <p className="text-gray-500 text-sm mb-3">
                Published: {book.published_year}
              </p>
            )}
            <div className="flex-box items-center justify-between mt-4">
              {typeof book.copies_available === 'number' && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium mx-1 me-3 ${
                  book.copies_available > 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {book.copies_available > 0 ? 'Available' : 'Checked Out'}
                </span>
              )}
              <Link href={`/books/${book.id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}