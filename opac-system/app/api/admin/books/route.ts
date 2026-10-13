import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { requireAdmin } from '@/app/api/admin/_auth';
import { normalizeBook } from '@/lib/supabase';

/**
 * POST /api/admin/books        — create a book
 * PUT  /api/admin/books        — update a book (body must include `id`)
 * DELETE /api/admin/books      — delete a book (body: { id })
 *
 * The live `books` table stores `author` / `subjects` as plain text columns
 * holding JSON-encoded arrays (see lib/supabase.ts), so the arrays are
 * stringified here. Without that the INSERT would write the literal
 * "[object Object]".
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const { id, title, author, isbn, format, published_year, description, subjects, publisher, language, pages, location, copies_available, total_copies } = body;

  if (!title || typeof title !== 'string') {
    return NextResponse.json({ success: false, error: 'title is required' }, { status: 400 });
  }

  const row: Record<string, unknown> = {
    title: title.trim(),
    author: JSON.stringify(Array.isArray(author) ? author : []),
    isbn: isbn || null,
    format: format || 'book',
    published_year: published_year ? Number(published_year) : null,
    description: description || null,
    subjects: JSON.stringify(Array.isArray(subjects) ? subjects : []),
    publisher: publisher || null,
    language: language || 'en',
    pages: pages ? Number(pages) : null,
    location: location || null,
    copies_available: copies_available != null ? Number(copies_available) : null,
    total_copies: total_copies != null ? Number(total_copies) : null,
  };

  const admin = createAdminClient();

  if (id) {
    const { data, error } = await admin.from('books').update(row).eq('id', id).select('*').single();
    if (error) {
      console.error('Book update error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, book: normalizeBook(data) });
  }

  const { data, error } = await admin.from('books').insert(row).select('*').single();
  if (error) {
    console.error('Book insert error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, book: normalizeBook(data) }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  return POST(request);
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const id = body?.id;
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing book id' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('books').delete().eq('id', id);
  if (error) {
    console.error('Book delete error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted: id });
}