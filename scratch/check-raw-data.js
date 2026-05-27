const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('materials').select('name_ko, raw_data').not('raw_data', 'is', null).limit(5);
  if (error) {
    console.error('Error:', error.message);
  } else if (data && data.length > 0) {
    for (const item of data) {
      console.log(`Material: ${item.name_ko}`);
      console.log('raw_data:', typeof item.raw_data === 'string' ? JSON.parse(item.raw_data) : item.raw_data);
    }
  } else {
    console.log('No raw_data found');
  }
}

test();
