"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Calendar, Search, Users } from "lucide-react";
import Link from "next/link";

interface CatalogStats {
  totalItems: number;
  uniqueTitles: number;
  publishers: number;
  authors: number;
  earliestYear: number | null;
  latestYear: number | null;
  digitalItems: number;
  lastAdded: string | null;
  byDecade: { decade: number; count: number }[];
  byFormat: { format: string; count: number }[];
  examples: string[];
}

export default function Home() {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Every number on this page is read from /api/stats, which queries the
  // `books` table - nothing here is hardcoded.
  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const response = await fetch("/api/stats");
        if (!response.ok) {
          throw new Error(`Stats request failed (${response.status})`);
        }
        const payload = await response.json();
        if (!payload.success) {
          throw new Error(payload.error || "Failed to load catalog statistics");
        }
        if (!cancelled) setStats(payload.stats as CatalogStats);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load catalog statistics");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = term.trim();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  }

  const value = (n: number | null | undefined) =>
    isLoading ? "—" : n == null ? "—" : n.toLocaleString();

  const yearRange =
    stats?.earliestYear != null && stats?.latestYear != null
      ? `${stats.earliestYear}–${stats.latestYear}`
      : "—";

  const maxDecade = stats?.byDecade.reduce((max, d) => Math.max(max, d.count), 0) ?? 0;

  const headlineStats = [
    { label: "Catalog Items", value: value(stats?.totalItems), icon: <BookOpen className="h-6 w-6" /> },
    { label: "Unique Titles", value: value(stats?.uniqueTitles), icon: <BookOpen className="h-6 w-6" /> },
    { label: "Publishers", value: value(stats?.publishers), icon: <Users className="h-6 w-6" /> },
    { label: "Publication Years", value: isLoading ? "—" : yearRange, icon: <Calendar className="h-6 w-6" /> },
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-6">
        <h1 className="text-5xl font-bold text-blue-600">
          Welcome to the{" "}
          <span className="text-blue-600">Open Public Access Catalog</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Discover and search the library collection with our modern catalog system.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-3xl mx-auto mt-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search by title, author, or ISBN..."
              className="w-full pl-12 pr-28 py-4 text-lg text-gray-200 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </div>
        </form>

        <div className="mt-4 text-sm text-gray-500">
          {stats?.examples?.length ? (
            <>
              Try searching for:{" "}
              {stats.examples.map((example, index) => (
                <span key={example}>
                  <button
                    type="button"
                    onClick={() => router.push(`/search?q=${encodeURIComponent(example)}`)}
                    className="text-blue-600 hover:underline"
                  >
                    {example}
                  </button>
                  {index < stats.examples.length - 1 ? ", " : ""}
                </span>
              ))}
            </>
          ) : (
            <span>
              {isLoading
                ? "Loading search examples..."
                : "Browse the collection to explore what is available."}
            </span>
          )}
        </div>
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
          Could not load catalog statistics: {error}
        </div>
      )}

      {/* Collection Snapshot - every value read from the database */}
      <section className="py-4">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="text-3xl font-bold">Our Collection</h2>
          <span className="text-sm text-gray-500">Live from the catalog database</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {headlineStats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white p-6 rounded-xl border border-gray-200 text-center"
            >
              <div className="inline-flex items-center justify-center p-3 bg-blue-100 text-blue-600 rounded-lg mb-4">
                {stat.icon}
              </div>
              <div className="text-3xl font-bold text-blue-600">{stat.value}</div>
              <div className="text-gray-700 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Publication Timeline */}
      <section className="py-4">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="text-3xl font-bold">Publication Timeline</h2>
          <span className="text-sm text-gray-500">
            {isLoading ? "—" : `${yearRange} · ${value(stats?.authors)} authors`}
          </span>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading timeline...</div>
        ) : stats && stats.byDecade.length > 0 ? (
          <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
            {stats.byDecade.map((bucket) => (
              <div key={bucket.decade} className="flex items-center gap-4">
                <span className="w-20 text-sm font-medium text-gray-700 flex-shrink-0">
                  {bucket.decade}s
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${maxDecade ? (bucket.count / maxDecade) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-24 text-right text-sm text-gray-600 flex-shrink-0">
                  {bucket.count} {bucket.count === 1 ? "item" : "items"}
                </span>
              </div>
            ))}
            <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
              {stats.uniqueTitles} unique titles across {stats.byDecade.length} decades.{" "}
              {stats.digitalItems === 0
                ? "All holdings are print; no digital items are catalogued yet."
                : `${stats.digitalItems} digital items catalogued.`}
            </p>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            No publication years recorded in the catalog yet.
          </div>
        )}
      </section>

      {/* Quick Access */}
      <section className="py-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">Quick Access</h2>
          <Link href="/browse" className="text-blue-600 hover:text-blue-700 flex items-center gap-2">
            Browse all resources <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/browse"
            className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-all hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl text-gray-900 font-semibold">Full Catalog</h3>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-600">
                {value(stats?.totalItems)} items
              </span>
            </div>
            <p className="text-gray-600">
              Browse every record held in the catalog, with title, author, publisher and
              publication year.
            </p>
            <div className="mt-4 text-blue-600 font-medium flex items-center gap-2">
              Browse now <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          <Link
            href="/search"
            className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-all hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 text-xl font-semibold">Advanced Search</h3>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-600">
                {value(stats?.uniqueTitles)} titles
              </span>
            </div>
            <p className="text-gray-600">
              Search by title, author, ISBN or format, and narrow the results by publication
              year.
            </p>
            <div className="mt-4 text-blue-600 font-medium flex items-center gap-2">
              Start searching <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          <Link
            href="/browse"
            className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-all hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 text-xl font-semibold">Publishers</h3>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-600">
                {value(stats?.publishers)} publishers
              </span>
            </div>
            <p className="text-gray-600">
              Holdings span {isLoading ? "—" : yearRange}, covering {value(stats?.authors)}{" "}
              distinct authors.
            </p>
            <div className="mt-4 text-blue-600 font-medium flex items-center gap-2">
              Explore now <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
