// scripts/migrate.js
//
// Applies database/schema.sql and the numbered migration files to the live
// Supabase Postgres instance using the service-role connection string.
//
// The app's migrations were never run against this project, so the live DB has
// only `books` and `user_profiles`. Everything the admin page and the account
// page depend on (loans, reservations, reviews, fines, audit_log, RLS,
// triggers, the role helper functions) is missing.
//
// Usage: node scripts/migrate.js [--dry-run]

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load .env.local without a dependency. The connection string below is the
// only value this script needs; everything else is left alone.
const envFile = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const rawUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
// The Supabase pooler presents a self-signed certificate. pg's default
// verify-full rejects it; libpq's `require` (weaker) accepts it, which is
// what the app's own connection strings already rely on.
const DATABASE_URL = rawUrl.includes('sslmode=require') && !rawUrl.includes('uselibpqcompat')
  ? `${rawUrl}&uselibpqcompat=true`
  : rawUrl;
if (!DATABASE_URL) {
  console.error('Set POSTGRES_URL (or POSTGRES_URL_NON_POOLING) in .env.local');
  process.exit(1);
}

const DB_DIR = path.join(__dirname, '..', 'database');
// schema.sql is the base definition and must run before the numbered fixes:
// 002/003 replace the broken `auth.jwt()` policies that schema.sql declares,
// so running schema.sql last would silently undo them.
const files = [
  'schema.sql',
  ...fs.readdirSync(DB_DIR)
    .filter((f) => /^\d+.*\.sql$/.test(f))
    .sort(),
];

// schema.sql declares `CREATE TABLE books`, but the live table already exists
// with a different shape (text author column, no copies_available). Make the
// DDL idempotent so re-running is safe and the existing rows survive.
function idempotent(sql) {
  return sql.replace(/CREATE TABLE (\s+IF NOT EXISTS\s+)?(\S+\.)?(\w+)/g, (m, ifne, schema, table) => {
    return `CREATE TABLE IF NOT EXISTS ${schema || ''}${table}`;
  });
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log(`Applying ${files.length} migration file(s) to ${DATABASE_URL.replace(/(postgres:\/\/[^:]+:[^@]+@)[^/]+/, '$1***')}`);
  if (dryRun) console.log('(dry run - nothing written)');

  await client.connect();
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(DB_DIR, file), 'utf8');
      const statement = idempotent(sql);

      if (dryRun) {
        console.log(`-- [dry-run] ${file}: ${statement.length} chars`);
        continue;
      }

      console.log(`-- ${file}`);
      try {
        await client.query(statement);
      } catch (err) {
        console.error(`  !! ${file} failed: ${err.message}`);
        throw err;
      }
    }
    console.log('Migrations applied successfully.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});