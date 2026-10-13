#!/usr/bin/env node

/**
 * OPAC Backup Script
 *
 * This script creates local SQLite backups of the Supabase PostgreSQL database.
 * It should be run as a cron job for automated daily backups.
 */

const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BACKUP_DIR = path.join(__dirname, '../backups');

// Create backup directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function backupDatabase() {
  console.log(`Starting database backup at ${new Date().toISOString()}`);

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  // Initialize Supabase client with service role key (for full access)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Generate backup filename with timestamp
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
  const backupFile = path.join(BACKUP_DIR, `opac_backup_${timestamp}.sqlite`);

  // Create SQLite database
  const db = new sqlite3.Database(backupFile);

  try {
    // Create tables in SQLite
    await createTables(db);

    // Backup books table
    console.log('Backing up books table...');
    await backupTable(supabase, db, 'books', [
      'id', 'title', 'author', 'isbn', 'format', 'published_year',
      'cover_url', 'description', 'subjects', 'publisher',
      'language', 'pages', 'copies_available', 'total_copies',
      'location', 'created_at', 'updated_at'
    ]);

    // Backup loans table
    console.log('Backing up loans table...');
    await backupTable(supabase, db, 'loans', [
      'id', 'book_id', 'user_id', 'checkout_date', 'due_date',
      'returned_at', 'status', 'fine_amount', 'fine_paid',
      'created_at', 'updated_at'
    ]);

    // Backup reservations table
    console.log('Backing up reservations table...');
    await backupTable(supabase, db, 'reservations', [
      'id', 'book_id', 'user_id', 'reservation_date', 'status',
      'expires_at', 'notified_at', 'priority', 'created_at', 'updated_at'
    ]);

    // Backup user_profiles table (excluding sensitive data)
    console.log('Backing up user_profiles table...');
    await backupTable(supabase, db, 'user_profiles', [
      'id', 'library_card_number', 'name', 'role',
      'membership_start_date', 'membership_end_date', 'is_active',
      'created_at', 'updated_at'
    ]);

    // Backup reviews table
    console.log('Backing up reviews table...');
    await backupTable(supabase, db, 'reviews', [
      'id', 'book_id', 'user_id', 'rating', 'comment',
      'is_approved', 'created_at', 'updated_at'
    ]);

    // Backup fines table
    console.log('Backing up fines table...');
    await backupTable(supabase, db, 'fines', [
      'id', 'user_id', 'loan_id', 'amount', 'reason', 'status',
      'due_date', 'paid_at', 'waived_by', 'waived_at',
      'created_at', 'updated_at'
    ]);

    console.log(`Backup completed successfully: ${backupFile}`);
    console.log(`Backup size: ${fs.statSync(backupFile).size} bytes`);

    // Clean up old backups (keep last 30 days)
    await cleanupOldBackups();

    db.close();

  } catch (error) {
    console.error('Backup failed:', error);
    db.close();

    // Delete partial backup file if it exists
    if (fs.existsSync(backupFile)) {
      fs.unlinkSync(backupFile);
    }

    process.exit(1);
  }
}

function createTables(db) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Books table
      db.run(`
        CREATE TABLE IF NOT EXISTS books (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          author TEXT NOT NULL,
          isbn TEXT,
          format TEXT NOT NULL,
          published_year INTEGER,
          cover_url TEXT,
          description TEXT,
          subjects TEXT,
          publisher TEXT,
          language TEXT,
          pages INTEGER,
          copies_available INTEGER NOT NULL,
          total_copies INTEGER NOT NULL,
          location TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      // Loans table
      db.run(`
        CREATE TABLE IF NOT EXISTS loans (
          id TEXT PRIMARY KEY,
          book_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          checkout_date TEXT NOT NULL,
          due_date TEXT NOT NULL,
          returned_at TEXT,
          status TEXT NOT NULL,
          fine_amount REAL DEFAULT 0.00,
          fine_paid INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (book_id) REFERENCES books(id)
        )
      `);

      // Add other table creation statements here...

      resolve();
    });
  });
}

async function backupTable(supabase, db, tableName, columns) {
  return new Promise(async (resolve, reject) => {
    try {
      // Fetch data from Supabase
      const { data, error } = await supabase
        .from(tableName)
        .select(columns.join(','));

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log(`No data in ${tableName} table`);
        resolve();
        return;
      }

      // Prepare insert statement
      const placeholders = columns.map(() => '?').join(', ');
      const insertSql = `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

      // Insert data into SQLite
      db.serialize(() => {
        const stmt = db.prepare(insertSql);

        for (const row of data) {
          const values = columns.map(col => {
            const value = row[col];

            // Handle arrays by converting to JSON strings
            if (Array.isArray(value)) {
              return JSON.stringify(value);
            }

            // Handle dates
            if (value instanceof Date) {
              return value.toISOString();
            }

            // Handle null values
            return value !== null ? value : null;
          });

          stmt.run(values);
        }

        stmt.finalize();
        console.log(`Backed up ${data.length} rows from ${tableName}`);
        resolve();
      });

    } catch (error) {
      reject(error);
    }
  });
}

async function cleanupOldBackups() {
  const files = fs.readdirSync(BACKUP_DIR);
  const backupFiles = files.filter(file => file.startsWith('opac_backup_') && file.endsWith('.sqlite'));

  if (backupFiles.length <= 30) {
    return; // Keep all backups if we have less than 30
  }

  // Sort by date (newest first)
  backupFiles.sort((a, b) => {
    const dateA = a.match(/opac_backup_(\d{4}-\d{2}-\d{2})/);
    const dateB = b.match(/opac_backup_(\d{4}-\d{2}-\d{2})/);
    return dateB[1].localeCompare(dateA[1]);
  });

  // Keep only the 30 most recent backups
  const filesToDelete = backupFiles.slice(30);

  for (const file of filesToDelete) {
    const filePath = path.join(BACKUP_DIR, file);
    fs.unlinkSync(filePath);
    console.log(`Deleted old backup: ${file}`);
  }

  console.log(`Cleaned up ${filesToDelete.length} old backups`);
}

// Run backup if called directly
if (require.main === module) {
  backupDatabase();
}

module.exports = { backupDatabase };