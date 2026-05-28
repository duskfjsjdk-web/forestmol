const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('materials')
    .select('bioactivity')
    .eq('name_ko', '잣나무')
    .limit(1);

  if (error) {
    console.error('Error fetching:', error);
    return;
  }

  if (data && data[0] && data[0].bioactivity) {
    console.log(data[0].bioactivity[0]);
  } else {
    console.log("No data found");
  }
}

check();
