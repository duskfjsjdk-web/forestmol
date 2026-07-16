import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function run() {
  const { error } = await supabase
    .from('materials')
    .update({ bioactivity: [] })
    .eq('id', 'e4a6bec3-d222-43ff-91b9-5a29e4f060af');

  if (error) {
    console.error('Update failed:', error);
  } else {
    console.log('Successfully cleared bioactivity for e4a6bec3...');
  }
}

run();
