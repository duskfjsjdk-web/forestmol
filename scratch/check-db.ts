import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkData() {
  const { data, error } = await supabase
    .from('materials')
    .select('name_ko, name, cosmetic_allowed, cosmetic_matched_ingredients')
    .not('cosmetic_matched_ingredients', 'is', null)
    .limit(3);

  if (error) {
    console.error('조회 에러:', error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

checkData();
