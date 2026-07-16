import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function run() {
  const { data } = await supabase
    .from('materials')
    .select('id, name_ko, bioactivity, usage_method, display_bioactivity')
    .eq('name_ko', '호장근');
    
  console.log(JSON.stringify(data, null, 2));
}

run();
