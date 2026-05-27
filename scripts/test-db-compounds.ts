import { getSupabaseAdmin } from '../src/lib/supabaseServer';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const supabase = getSupabaseAdmin();
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
