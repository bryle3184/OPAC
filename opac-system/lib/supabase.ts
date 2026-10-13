import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types (to be populated based on actual Supabase schema)
export interface Book {
  id: string;
  title: string;
  author: string[];
  isbn: string | null;
  format: string;
  published_year: number | null;
  cover_url: string | null;
  description: string | null;
  subjects: string[];
  copies_available: number | null;
  total_copies: number | null;
  publisher?: string | null;
  language?: string | null;
  pages?: number | null;
  location?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Loan {
  id: string;
  book_id: string;
  user_id: string;
  checkout_date: string;
  due_date: string;
  returned_at: string | null;
  status: 'active' | 'returned' | 'overdue';
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  library_card_number: string;
  role: 'patron' | 'librarian' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  book_id: string;
  user_id: string;
  reservation_date: string;
  status: 'pending' | 'ready' | 'cancelled' | 'expired';
  expires_at: string;
  notified_at: string | null;
}

/*
 * Row normalisation
 * -----------------
 * The live `books` table does not match database/schema.sql: `author` and
 * `subjects` are plain `text` columns holding JSON-encoded arrays rather than
 * real Postgres `text[]`, several rows contain the raw DDL default expression
 * (e.g. "DEFAULT '{}'") instead of a value, and `copies_available` /
 * `total_copies` are missing entirely.
 *
 * Components were written against the schema.sql shape, so handing them raw
 * rows makes `book.author.join(...)` throw a TypeError and blanks the page.
 * Everything read from the API goes through normalizeBook() so callers can
 * keep relying on the declared Book type.
 */

/** Rows built from schema.sql sometimes store the literal DDL default text. */
function unwrapDefaultLiteral(value: string): string {
  const match = value.trim().match(/^DEFAULT\s+'([\s\S]*)'$/i);
  return match ? match[1] : value;
}

/**
 * Coerce whatever PostgREST returns for an array-ish column into a string[].
 * Handles real arrays, JSON-text arrays ('["A","B"]'), Postgres array literals
 * ('{A,B}'), DDL default text ("DEFAULT '{}'"), plain strings, and null/empty.
 */
function toStringArray(value: unknown): string[] {
  if (value == null) return [];

  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }

  if (typeof value !== 'string') return [];

  const raw = unwrapDefaultLiteral(value).trim();
  if (!raw || raw === '{}' || raw === '[]') return [];

  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return toStringArray(parsed);
    } catch {
      // Not valid JSON - fall through and treat it as a delimited string.
    }
  }

  if (raw.startsWith('{') && raw.endsWith('}')) {
    return raw
      .slice(1, -1)
      .split(',')
      .map((s) => s.trim().replace(/^"|"$/g, ''))
      .filter(Boolean);
  }

  return [raw];
}

function toStringOrNull(value: unknown): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value.length ? String(value[0]) : null;
  const raw = unwrapDefaultLiteral(String(value)).trim();
  return raw === '' ? null : raw;
}

function asNumberOrNull(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * The catalog export glued the MARC field tag onto author names
 * ("Gates, Jean Key 245"). Strip the trailing tag so the UI shows the name.
 * Presentation-level stopgap - drop this once the source records are repaired.
 */
function stripMarcTag(name: string): string {
  return name.replace(/\s+\d{3}$/, '').trim();
}

export function normalizeBook(row: any): Book {
  return {
    ...row,
    id: row?.id != null ? String(row.id) : '',
    title: toStringOrNull(row?.title) ?? 'Untitled',
    author: toStringArray(row?.author).map(stripMarcTag).filter(Boolean),
    isbn: toStringOrNull(row?.isbn),
    format: toStringOrNull(row?.format) ?? 'book',
    published_year: asNumberOrNull(row?.published_year),
    description: toStringOrNull(row?.description),
    subjects: toStringArray(row?.subjects),
    publisher: toStringOrNull(row?.publisher),
    language: toStringOrNull(row?.language) ?? 'en',
    pages: asNumberOrNull(row?.pages),
    location: toStringOrNull(row?.location),
    copies_available: asNumberOrNull(row?.copies_available),
    total_copies: asNumberOrNull(row?.total_copies),
  } as Book;
}

// Helper functions for common operations
export const catalogService = {
  async searchBooks(query: string, filters?: Record<string, any>) {
    let supabaseQuery = supabase.from('books').select('*');

    // Guard against an empty term turning the filter into '%%' noise.
    if (query) {
      supabaseQuery = supabaseQuery.or(
        [
          `title.ilike.%${query}%`,
          `description.ilike.%${query}%`,
          `author.ilike.%${query}%`,
          `isbn.ilike.%${query}%`,
        ].join(',')
      );
    }

    if (filters) {
      if (filters.author) {
        // `author` is a text column in the live schema (schema.sql declares
        // text[]), so match with ILIKE rather than array containment.
        supabaseQuery = supabaseQuery.ilike('author', `%${filters.author}%`);
      }
      if (filters.format) {
        supabaseQuery = supabaseQuery.eq('format', filters.format);
      }
      if (filters.year_min || filters.year_max) {
        if (filters.year_min && filters.year_max) {
          supabaseQuery = supabaseQuery.gte('published_year', filters.year_min).lte('published_year', filters.year_max);
        } else if (filters.year_min) {
          supabaseQuery = supabaseQuery.gte('published_year', filters.year_min);
        } else if (filters.year_max) {
          supabaseQuery = supabaseQuery.lte('published_year', filters.year_max);
        }
      }
    }

    const { data, error } = await supabaseQuery;
    if (error) throw error;
    return (data ?? []).map(normalizeBook);
  },

  async getBookById(id: string) {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return normalizeBook(data);
  },

  async getAvailableBooks() {
    // copies_available does not exist in the live schema, so filter
    // client-side rather than with a .gt() that PostgREST would reject.
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? [])
      .map(normalizeBook)
      .filter((book) => book.copies_available == null || book.copies_available > 0)
      .slice(0, 20);
  },

  async getPopularBooks() {
    // This would typically join with loans table
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return (data ?? []).map(normalizeBook);
  },

  async getUserLoans(userId: string) {
    const { data, error } = await supabase
      .from('loans')
      .select('*, book:books(*)')
      .eq('user_id', userId)
      .order('due_date', { ascending: true });

    // Table may not exist yet (e.g., database not fully initialized).
    if (error?.code === 'PGRST205') return [];
    if (error) throw error;
    return data;
  },

  async getUserReservations(userId: string) {
    const { data, error } = await supabase
      .from('reservations')
      .select('*, book:books(*)')
      .eq('user_id', userId)
      .order('expires_at', { ascending: true });

    // Table may not exist yet (e.g., database not fully initialized).
    if (error?.code === 'PGRST205') return [];
    if (error) throw error;
    return data;
  },

  async getAllBooks() {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('title', { ascending: true });

    if (error) throw error;
    return (data ?? []).map(normalizeBook);
  },
};