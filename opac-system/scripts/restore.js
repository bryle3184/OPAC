#!/usr/bin/env node

/**
 * OPAC Restore Script
 *
 * This script restores data from a local SQLite backup to Supabase.
 * Use with caution as it will overwrite existing data.
 */

const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BACKUP_DIR = path.join(__dirname, '../backups');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function restoreDatabase() {
  console.log('=== OPAC Database Restore ===');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase environment variables');
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running restore');
    process.exit(1);
  }

  // List available backups
  if (!fs.existsSync(BACKUP_DIR)) {
    console.error(`Backup directory not found: ${BACKUP_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(BACKUP_DIR);
  const backupFiles = files.filter(file => file.startsWith('opac_backup_') && file.endsWith('.sqlite'));

  if (backupFiles.length === 0) {
    console.error('No backup files found');
    process.exit(1);
  }

  // Display backups with dates
  console.log('\nAvailable backups:');
  backupFiles.forEach((file, index) => {
    const stats = fs.statSync(path.join(BACKUP_DIR, file));
    console.log(`  ${index + 1}. ${file} (${stats.size} bytes, ${new Date(stats.mtime).toLocaleString()})`);
  });

  // Ask user to select a backup
  rl.question('\nEnter backup number to restore (or "cancel" to abort): ', async (answer) => {
    if (answer.toLowerCase() === 'cancel') {
      console.log('Restore cancelled');
      rl.close();
      process.exit(0);
    }

    const index = parseInt(answer) - 1;
    if (isNaN(index) || index < 0 || index >= backupFiles.length) {
      console.error('Invalid selection');
      rl.close();
      process.exit(1);
    }

    const selectedFile = backupFiles[index];
    const backupPath = path.join(BACKUP_DIR, selectedFile);

    console.log(`\nSelected backup: ${selectedFile}`);

    // Confirm restoration
    rl.question('WARNING: This will overwrite existing data. Type "CONFIRM" to proceed: ', async (confirmation) => {
      if (confirmation !== 'CONFIRM') {
        console.log('Restore cancelled');
        rl.close();
        process.exit(0);
      }

      try {
        console.log('\nStarting restore...');

        // Initialize Supabase client
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Open SQLite database
        const db = new sqlite3.Database(backupPath);

        // Restore tables
        console.log('Restoring books table...');
        await restoreTable(supabase, db, 'books');

        console.log('Restoring loans table...');
        await restoreTable(supabase, db, 'loans');

        console.log('Restoring reservations table...');
        await restoreTable(supabase, db, 'reservations');

        console.log('Restoring user_profiles table...');
        await restoreTable(supabase, db, 'user_profiles');

        console.log('Restoring reviews table...');
        await restoreTable(supabase, db, 'reviews');

        console.log('Restoring fines table...');
        await restoreTable(supabase, db, 'fines');

        db.close();
        console.log('\n✅ Restore completed successfully!');
        rl.close();

      } catch (error) {
        console.error('Restore failed:', error);
        rl.close();
        process.exit(1);
      }
    });
  });
}

async function restoreTable(supabase, db, tableName) {
  return new Promise((resolve, reject) => {
    // First, clear existing data
    supabase.from(tableName).delete().neq('id', '0')
      .then(() => {
        // Read data from SQLite
        db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          if (!rows || rows.length === 0) {
            console.log(`  No data in ${tableName} backup`);
            resolve();
            return;
          }

          // Insert data back to Supabase
          const promises = rows.map(row => {
            // Parse array fields if they exist
            const processedRow = { ...row };

            // Handle array fields stored as JSON strings
            if (row.author && typeof row.author === 'string') {
              try {
                processedRow.author = JSON.parse(row.author);
              } catch (e) {
                processedRow.author = [row.author];
              }
            }

            if (row.subjects && typeof row.subjects === 'string') {
              try {
                processedRow.subjects = JSON.parse(row.subjects);
              } catch (e) {
                processedRow.subjects = [row.subjects];
              }
            }

            return supabase.from(tableName).upsert(processedRow);
          });

          Promise.all(promises)
            .then(() => {
              console.log(`  Restored ${rows.length} rows to ${tableName}`);
              resolve();
            })
            .catch(reject);
        });
      })
      .catch(reject);
  });
}

// Run restore if called directly
if (require.main === module) {
  restoreDatabase();
}

module.exports = { restoreDatabase };