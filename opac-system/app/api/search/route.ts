import { NextRequest, NextResponse } from 'next/server';
import { catalogService } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const author = searchParams.get('author');
  const format = searchParams.get('format');
  const yearMin = searchParams.get('year_min');
  const yearMax = searchParams.get('year_max');

  try {
    const filters: Record<string, any> = {};
    if (author) filters.author = author;
    if (format) filters.format = format;
    if (yearMin) filters.year_min = parseInt(yearMin);
    if (yearMax) filters.year_max = parseInt(yearMax);

    const results = await catalogService.searchBooks(query, filters);

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
      query,
      filters,
    });
  } catch (error: any) {
    console.error('Search API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to search books',
      },
      { status: 500 }
    );
  }
}