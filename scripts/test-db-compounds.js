const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('materials')
    .select('id, name_ko, compounds')
    .not('compounds', 'is', null)
    .limit(10);
  
  if (error) {
    console.error('Error fetching materials:', error);
    return;
  }
  
  console.log('Materials with compounds:');
  for (const m of data) {
    console.log(`- ${m.name_ko} (id: ${m.id}):`, JSON.stringify(m.compounds).slice(0, 300));
  }
}

run();
