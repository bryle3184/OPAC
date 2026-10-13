const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', '.env.local');
for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const rawUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
const DATABASE_URL = rawUrl.includes('sslmode=require') && !rawUrl.includes('uselibpqcompat')
  ? `${rawUrl}&uselibpqcompat=true`
  : rawUrl;

(async () => {
  const c = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const tables = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  console.log('tables:', tables.rows.map(r => r.table_name).join(', '));
  for (const t of ['loans', 'reservations', 'reviews', 'fines', 'audit_log']) {
    const r = await c.query(`SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_schema='public' AND table_name='${t}' ORDER BY ordinal_position`);
    console.log(t + ':', r.rows.length ? JSON.stringify(r.rows) : 'MISSING');
  }
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });