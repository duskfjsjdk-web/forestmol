const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('No Supabase credentials found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('materials')
    .select('id, name_ko, embedding')
    .not('embedding', 'is', null)
    .limit(1);

  if (error) {
    console.error('Error fetching materials:', error.message);
    return;
  }

  if (data && data.length > 0) {
    const item = data[0];
    console.log(`Material: ${item.name_ko}`);
    console.log(`Embedding Type: ${typeof item.embedding}`);
    if (Array.isArray(item.embedding)) {
      console.log(`Embedding Length (Dimension): ${item.embedding.length}`);
    } else if (typeof item.embedding === 'string') {
      // Sometimes returned as a string representation of vector
      const vector = item.embedding.replace('[', '').replace(']', '').split(',');
      console.log(`Embedding Length (Dimension from string): ${vector.length}`);
    } else {
      console.log('Embedding value:', item.embedding);
    }
  } else {
    console.log('No materials with embeddings found.');
  }
}

check();
