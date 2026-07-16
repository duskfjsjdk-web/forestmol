import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function run() {
  const { data, error } = await supabase
    .from('materials')
    .select('name_ko, updated_at')
    .eq('name_ko', '호장근')
    .limit(1);

  if (error) {
    console.error(error);
    return;
  }
  
  console.log(data);
}

run();
