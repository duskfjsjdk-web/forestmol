import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const dummyEmbedding = Array(768).fill(0.1);
  const { data, error } = await supabase.rpc('match_materials', {
    query_embedding: dummyEmbedding,
    match_threshold: -1,
    match_count: 50,
  });

  if (error) {
    console.error('RPC Error:', error);
  } else {
    console.log('Result count:', data?.length);
    if (data && data.length > 0) {
      console.log('First result keys:', Object.keys(data[0]));
      
      const allowedItem = data.find((item: any) => item.cosmetic_allowed === true);
      if (allowedItem) {
        console.log('Found an allowed item:', allowedItem.name_ko);
        console.log('Its matched ingredients keys:', allowedItem.cosmetic_matched_ingredients ? Object.keys(allowedItem.cosmetic_matched_ingredients) : null);
        console.log('Matched ingredients:', allowedItem.cosmetic_matched_ingredients);
      } else {
        console.log('No allowed item found in top 50.');
      }
    }
  }
}

test();
