"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Filter, Book, User, Calendar, Hash } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { BookCard } from '@/components/BookCard';

interface SearchFilters {
  query: string;
  author: string;
  format: string;
  year_min: string;
  year_max: string;
  available: boolean;
}

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

function SearchContent() {
  const searchParams = useSearchParams();
  // The home page links here as /search?q=... - seed the form from the URL so
  // that deep link actually runs a search instead of landing on an empty page.
  const initialQuery = searchParams.get('q') ?? '';

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>({
    query: initialQuery,
    author: '',
    format: '',
    year_min: '',
    year_max: '',
    available: false,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Search query
  const { data: results, isLoading, error, refetch } = useQuery({
    queryKey: ['search', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.query) params.append('q', filters.query);
      if (filters.author) params.append('author', filters.author);
      if (filters.format) params.append('format', filters.format);
      if (filters.year_min) params.append('year_min', filters.year_min);
      if (filters.year_max) params.append('year_max', filters.year_max);

      const response = await fetch(`/api/search?${params}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: false, // Don't run automatically
  });

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, query: searchTerm }));
  };

  // Trigger search when filters change
  useEffect(() => {
    if (filters.query || filters.author || filters.format) {
      refetch();
    }
  }, [filters, refetch]);

  return (
    <div className="space-y-8">
      {/* Search Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Advanced Search</h1>
        <p className="text-gray-600">
          Search across the collection by title, author, or ISBN.
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSearch} className="space-y-6">
          {/* Main Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-900" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, author, or ISBN..."
              className="w-full pl-12 pr-4 py-3 text-lg border border-gray-900 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </div>

          {/* Filters Toggle */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            {filters.query && (
              <div className="text-sm text-gray-600">
                {results?.count || 0} results found
              </div>
            )}
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <User className="h-4 w-4" />
                  Author
                </label>
                <input
                  type="text"
                  value={filters.author}
                  onChange={(e) => setFilters(prev => ({ ...prev, author: e.target.value }))}
                  placeholder="Filter by author..."
                  className="w-full px-3 py-2 border border-gray-900 text-gray-900 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Book className="h-4 w-4" />
                  Format
                </label>
                <select
                  value={filters.format}
                  onChange={(e) => setFilters(prev => ({ ...prev, format: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-900 text-gray-900 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Formats</option>
                  <option value="book">Book</option>
                  <option value="ebook">E-Book</option>
                  <option value="audio">Audio Book</option>
                  <option value="periodical">Periodical</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Calendar className="h-4 w-4" />
                  Year Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={filters.year_min}
                    onChange={(e) => setFilters(prev => ({ ...prev, year_min: e.target.value }))}
                    placeholder="From"
                    className="w-full px-3 py-2 border border-gray-900 text-gray-900 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    value={filters.year_max}
                    onChange={(e) => setFilters(prev => ({ ...prev, year_max: e.target.value }))}
                    placeholder="To"
                    className="w-full px-3 py-2 border border-gray-900 text-gray-900 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Hash className="h-4 w-4" />
                  Availability
                </label>
                <div className="flex items-center h-10">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.available}
                      onChange={(e) => setFilters(prev => ({ ...prev, available: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Available Now</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Results Section */}
      <div className="space-y-6">
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Searching...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Search failed: {error.message}
          </div>
        )}

        {results && results.data && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Search Results</h2>
              <div className="text-gray-600">
                Showing {results.count} of {results.count} results
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.data.map((book: BookResult) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </>
        )}

        {!isLoading && !error && (!results || results.data.length === 0) && filters.query && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Try adjusting your search terms or filters to find what you're looking for.
            </p>
          </div>
        )}

        {!isLoading && !error && !filters.query && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="max-w-md mx-auto space-y-4">
              <h3 className="text-xl font-semibold text-gray-900">Search Tips</h3>
              <ul className="text-gray-600 space-y-2 text-left">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>Search terms match text in the title, author, ISBN, or description</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>Use the Author filter to narrow results to a specific author</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>Combine the Format and Year Range filters to focus a search</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>Results update automatically as you change the filters</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading search...</p>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}