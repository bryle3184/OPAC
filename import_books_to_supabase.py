import json
import os
from supabase import create_client, Client
from dotenv import load_dotenv
import sys

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = "https://qhcdpkplwnkjqpcbrjvs.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoY2Rwa3Bsd25ranFwY2JyanZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTYwMTI0NCwiZXhwIjoyMTA3MTc3MjQ0fQ.uq8gaNd0zKV-bm_Hu3JJVX6LdPvpG2GZpqzveXfEXU0"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def import_books():
    # Set encoding for printing
    sys.stdout.reconfigure(encoding='utf-8')

    try:
        with open('catalog_books.json', 'r', encoding='utf-8') as f:
            books = json.load(f)

        print(f"Starting import of {len(books)} books...")

        for book in books:
            # Clean data to match schema
            data = {
                "title": book.get("title"),
                "author": [book.get("author")] if book.get("author") else [],
                "isbn": book.get("isbn"),
                "format": "book",
                "published_year": int(book.get("publication_year")) if book.get("publication_year") else None,
                "publisher": book.get("publisher"),
            }

            try:
                # Use insert, ignore unique violations
                supabase.table('books').insert(data).execute()
                print(f"Successfully imported: {data['title']}")
            except Exception as e:
                # 23505 is the Postgres code for unique violation
                if "23505" in str(e):
                    print(f"Skipping duplicate: {data['title']}")
                else:
                    print(f"Error inserting {data['title']}: {e}")

        print("Import completed successfully!")

    except Exception as e:
        print(f"Error during import: {e}")

if __name__ == "__main__":
    import_books()
