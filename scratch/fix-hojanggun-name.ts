import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('materials')
    .update({ species: 'Polygonum cuspidatum SIEB. et ZUCC.' })
    .eq('id', 'e4a6bec3-d222-43ff-91b9-5a29e4f060af');
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Update successful:', data);
  }
}

main();
