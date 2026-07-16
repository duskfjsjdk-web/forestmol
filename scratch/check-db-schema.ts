import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkSchema() {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .limit(1);

  if (error) {
    console.error('에러:', error);
  } else if (data && data.length > 0) {
    const keys = Object.keys(data[0]);
    console.log('Columns:', keys);
    keys.forEach(key => {
      console.log(`- ${key}: ${typeof data[0][key]} (val: ${JSON.stringify(data[0][key]).substring(0, 50)})`);
    });
  }
}

checkSchema();
