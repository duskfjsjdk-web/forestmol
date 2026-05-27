const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: tables, error } = await supabase.from('reports').select('*').limit(1);
  if (error) {
    console.log('reports table query failed:', error.message);
  } else {
    console.log('reports table exists. Schema is valid. First row keys:', tables && tables.length > 0 ? Object.keys(tables[0]) : 'empty table');
  }
}

check();
