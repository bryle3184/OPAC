// scripts/apply-migrations.js
//
// Applies only the numbered migration files (002..007) to the live Supabase
// instance. database/schema.sql is deliberately skipped: it declares text[]
// columns + GIN indexes that the live `books` table does not have (plain text),
// so running it errors out. The numbered files are the fixes that were actually
// needed and are idempotent.
//
// Usage: node scripts/apply-migrations.js [--dry-run]

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const rawUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
const DATABASE_URL = rawUrl.includes('sslmode=require') && !rawUrl.includes('uselibpqcompat')
  ? `${rawUrl}&uselibpqcompat=true`
  : rawUrl;
if (!DATABASE_URL) {
  console.error('Set POSTGRES_URL (or POSTGRES_URL_NON_POOLING) in .env.local');
  process.exit(1);
}

const DB_DIR = path.join(__dirname, '..', 'database');
const files = fs.readdirSync(DB_DIR)
  .filter((f) => /^\d+.*\.sql$/.test(f))
  .sort();

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

  console.log(`Applying ${files.length} migration file(s)`);
  if (dryRun) console.log('(dry run - nothing written)');

  await client.connect();
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(DB_DIR, file), 'utf8');
      if (dryRun) {
        console.log(`-- [dry-run] ${file}: ${sql.length} chars`);
        continue;
      }
      console.log(`-- ${file}`);
      try {
        await client.query(sql);
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