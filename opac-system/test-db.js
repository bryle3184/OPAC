// Quick test to check if books are in the database
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Manual .env.local parse
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=["']?(.+?)["']?$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  console.log('URL:', env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Key present:', !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const { data, error } = await supabase
    .from('books')
    .select('id, title');

  if (error) {
    console.error('ERROR:', JSON.stringify(error, null, 2));
  } else {
    console.log('Found ' + data.length + ' books:');
    data.forEach(b => console.log('  - ' + b.title));
  }
}

test();
