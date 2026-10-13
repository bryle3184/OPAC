import { NextResponse } from 'next/server';
import { catalogService } from '@/lib/supabase';

/**
 * Catalog statistics derived from the `books` table.
 *
 * Everything the home page reports comes from here, so the landing page can
 * never drift from the database again.
 *
 * Note: this aggregates in JS from the full result set, which is fine at
 * catalog scale (tens/thousands of rows). At larger scale, move these
 * aggregates into a Postgres view or RPC and read that instead.
 */
export async function GET() {
  try {
    const books = await catalogService.getAllBooks();

    const totalItems = books.length;

    const distinct = (values: (string | null | undefined)[]) =>
      new Set(
        values
          .map((v) => (v ?? '').trim())
          .filter((v) => v.length > 0)
          .map((v) => v.toLowerCase())
      ).size;

    const uniqueTitles = distinct(books.map((b) => b.title));
    const publishers = distinct(books.map((b) => b.publisher));
    const authors = new Set(
      books
        .flatMap((b) => b.author)
        .map((a) => a.trim().toLowerCase())
        .filter((a) => a.length > 0)
    ).size;

    const years = books
      .map((b) => b.published_year)
      .filter((y): y is number => typeof y === 'number');

    const earliestYear = years.length ? Math.min(...years) : null;
    const latestYear = years.length ? Math.max(...years) : null;

    const decadeMap = new Map<number, number>();
    for (const y of years) {
      const decade = Math.floor(y / 10) * 10;
      decadeMap.set(decade, (decadeMap.get(decade) ?? 0) + 1);
    }
    const byDecade = [...decadeMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([decade, count]) => ({ decade, count }));

    const formatMap = new Map<string, number>();
    for (const b of books) {
      const format = (b.format ?? 'book').trim().toLowerCase() || 'book';
      formatMap.set(format, (formatMap.get(format) ?? 0) + 1);
    }
    const byFormat = [...formatMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([format, count]) => ({ format, count }));

    // Non-print holdings (ebook / audio / periodical).
    const digitalItems = byFormat
      .filter((f) => f.format !== 'book')
      .reduce((sum, f) => sum + f.count, 0);

    const createdAts = books
      .map((b) => b.created_at)
      .filter((v): v is string => typeof v === 'string' && v.length > 0)
      .sort();
    const lastAdded = createdAts.length ? createdAts[createdAts.length - 1] : null;

    // Real catalog values for the hero's example chips - never invented text.
    const examples = books
      .map((b) => (b.title ?? '').trim().replace(/[\s:;,.]+$/, ''))
      .filter((t) => t.length > 0 && t.length <= 42)
      .slice(0, 3);

    return NextResponse.json({
      success: true,
      source: 'database',
      generatedAt: new Date().toISOString(),
      stats: {
        totalItems,
        uniqueTitles,
        publishers,
        authors,
        earliestYear,
        latestYear,
        digitalItems,
        lastAdded,
        byDecade,
        byFormat,
        examples,
      },
    });
  } catch (error: any) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to load catalog statistics',
      },
      { status: 500 }
    );
  }
}