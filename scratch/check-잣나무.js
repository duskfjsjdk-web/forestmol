const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('materials')
    .select('name_ko, bioactivity, data_source')
    .not('bioactivity', 'is', null)
    .limit(2000);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const matches = data.filter(item => {
    return item.bioactivity.some(val => val.includes('약용') || val.includes('식용'));
  }).slice(0, 5);

  console.log("Found matching records containing '약용' or '식용' in bioactivity:");
  console.log(JSON.stringify(matches, null, 2));
}

check();
