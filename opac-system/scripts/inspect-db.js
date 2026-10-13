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
  const r = await c.query("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_schema='public' AND table_name='books' ORDER BY ordinal_position");
  console.log('books:', JSON.stringify(r.rows));
  const r2 = await c.query("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_schema='public' AND table_name='user_profiles' ORDER BY ordinal_position");
  console.log('user_profiles:', JSON.stringify(r2.rows));
  const r3 = await c.query("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_schema='auth' AND table_name='users' ORDER BY ordinal_position");
  console.log('auth.users:', JSON.stringify(r3.rows));
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });