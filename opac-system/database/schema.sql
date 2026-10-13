-- Open Public Access Catalog (OPAC) - Database Schema
-- This schema can be used with Supabase PostgreSQL

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Books table
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  author TEXT[] NOT NULL DEFAULT '{}',
  isbn VARCHAR(13) UNIQUE,
  format VARCHAR(50) NOT NULL DEFAULT 'book', -- 'book', 'ebook', 'audio', 'periodical'
  published_year INTEGER,
  cover_url TEXT,
  description TEXT,
  subjects TEXT[] DEFAULT '{}',
  publisher TEXT,
  language VARCHAR(10) DEFAULT 'en',
  pages INTEGER,
  copies_available INTEGER NOT NULL DEFAULT 1,
  total_copies INTEGER NOT NULL DEFAULT 1,
  location VARCHAR(100), -- Shelf location
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for search optimization
CREATE INDEX idx_books_title ON books USING gin(to_tsvector('english', title));
CREATE INDEX idx_books_author ON books USING gin(author);
CREATE INDEX idx_books_subjects ON books USING gin(subjects);
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_available ON books(copies_available);

-- Loans table
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkout_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ NOT NULL,
  returned_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'overdue')),
  fine_amount DECIMAL(10, 2) DEFAULT 0.00,
  fine_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for loans
CREATE INDEX idx_loans_user_id ON loans(user_id);
CREATE INDEX idx_loans_book_id ON loans(book_id);
CREATE INDEX idx_loans_due_date ON loans(due_date);
CREATE INDEX idx_loans_status ON loans(status);

-- Reservations table
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reservation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'cancelled', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  notified_at TIMESTAMPTZ,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for reservations
CREATE INDEX idx_reservations_user_id ON reservations(user_id);
CREATE INDEX idx_reservations_book_id ON reservations(book_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_expires_at ON reservations(expires_at);

-- User profiles (extends auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  library_card_number VARCHAR(50) UNIQUE NOT NULL,
  name TEXT,
  phone VARCHAR(20),
  address TEXT,
  date_of_birth DATE,
  role VARCHAR(20) NOT NULL DEFAULT 'patron' CHECK (role IN ('patron', 'librarian', 'admin')),
  membership_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  membership_end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reviews table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_approved BOOLEAN DEFAULT FALSE, -- For moderation
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(book_id, user_id)
);

-- Create indexes for reviews
CREATE INDEX idx_reviews_book_id ON reviews(book_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_approved ON reviews(is_approved);

-- Fines table (separate from loans for better tracking)
CREATE TABLE fines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  reason VARCHAR(100) NOT NULL, -- 'overdue', 'damage', 'lost'
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'waived')),
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  waived_by UUID REFERENCES auth.users(id),
  waived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for fines
CREATE INDEX idx_fines_user_id ON fines(user_id);
CREATE INDEX idx_fines_status ON fines(status);
CREATE INDEX idx_fines_due_date ON fines(due_date);

-- Audit log table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for audit log
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Functions and Triggers

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables with updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%s_updated_at ON %I;
            CREATE TRIGGER update_%s_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END;
$$;

-- Function to calculate due date (14 days from checkout)
CREATE OR REPLACE FUNCTION calculate_due_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.due_date = NEW.checkout_date + INTERVAL '14 days';
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_loan_due_date
BEFORE INSERT ON loans
FOR EACH ROW
EXECUTE FUNCTION calculate_due_date();

-- Function to update book availability when loan is returned
CREATE OR REPLACE FUNCTION update_book_availability_on_return()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.returned_at IS NOT NULL AND OLD.returned_at IS NULL THEN
        UPDATE books
        SET copies_available = copies_available + 1
        WHERE id = NEW.book_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_book_on_loan_return
AFTER UPDATE ON loans
FOR EACH ROW
EXECUTE FUNCTION update_book_availability_on_return();

-- Function to update book availability when loan is created
CREATE OR REPLACE FUNCTION update_book_availability_on_loan()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE books
    SET copies_available = copies_available - 1
    WHERE id = NEW.book_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_book_on_loan_create
AFTER INSERT ON loans
FOR EACH ROW
EXECUTE FUNCTION update_book_availability_on_loan();

-- Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE fines ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Books policies: Everyone can read, only librarians/admins can modify
CREATE POLICY "Books are viewable by everyone" ON books
    FOR SELECT USING (true);

CREATE POLICY "Books can be inserted by librarians and admins" ON books
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' IN ('librarian', 'admin'));

CREATE POLICY "Books can be updated by librarians and admins" ON books
    FOR UPDATE USING (auth.jwt() ->> 'role' IN ('librarian', 'admin'));

CREATE POLICY "Books can be deleted by admins only" ON books
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- Loans policies: Users can see their own loans
CREATE POLICY "Users can view their own loans" ON loans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Librarians can view all loans" ON loans
    FOR SELECT USING (auth.jwt() ->> 'role' IN ('librarian', 'admin'));

CREATE POLICY "Loans can be created by librarians and admins" ON loans
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' IN ('librarian', 'admin'));

CREATE POLICY "Loans can be updated by librarians and admins" ON loans
    FOR UPDATE USING (auth.jwt() ->> 'role' IN ('librarian', 'admin'));

-- Sample data insertion
INSERT INTO books (title, author, isbn, format, published_year, description, copies_available, total_copies) VALUES
('To Kill a Mockingbird', ARRAY['Harper Lee'], '9780446310789', 'book', 1960, 'A novel about racial injustice and moral growth in the American South.', 5, 5),
('1984', ARRAY['George Orwell'], '9780451524935', 'book', 1949, 'A dystopian social science fiction novel and cautionary tale about totalitarianism.', 3, 5),
('The Great Gatsby', ARRAY['F. Scott Fitzgerald'], '9780743273565', 'book', 1925, 'A novel about the American Dream and the Roaring Twenties.', 4, 6),
('Pride and Prejudice', ARRAY['Jane Austen'], '9780141439518', 'book', 1813, 'A romantic novel of manners that depicts the emotional development of Elizabeth Bennet.', 6, 8),
('The Catcher in the Rye', ARRAY['J.D. Salinger'], '9780316769488', 'book', 1951, 'A novel about teenage alienation and loss of innocence.', 2, 4),
('Brave New World', ARRAY['Aldous Huxley'], '9780060850524', 'book', 1932, 'A dystopian novel about a technologically advanced future society.', 7, 7),
('The Hobbit', ARRAY['J.R.R. Tolkien'], '9780547928227', 'book', 1937, 'A fantasy novel about the adventures of hobbit Bilbo Baggins.', 5, 8),
('Harry Potter and the Sorcerer''s Stone', ARRAY['J.K. Rowling'], '9780590353427', 'book', 1997, 'The first novel in the Harry Potter series.', 8, 10),
('The Lord of the Rings', ARRAY['J.R.R. Tolkien'], '9780618640157', 'book', 1954, 'An epic high-fantasy novel.', 3, 6),
('The Da Vinci Code', ARRAY['Dan Brown'], '9780307474278', 'book', 2003, 'A mystery thriller novel.', 9, 10);