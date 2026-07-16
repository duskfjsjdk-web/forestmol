import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function run() {
  const { data, error } = await supabase
    .from('materials')
    .select('name_ko, data_source, usage_method')
    .eq('name_ko', '편백')
    .order('data_source');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Result:', JSON.stringify(data, null, 2));
  }
}

run();
