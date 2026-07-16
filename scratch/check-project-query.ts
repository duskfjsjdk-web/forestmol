import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function test() {
  // 편백 소재 ID 찾기
  const { data: materials, error: e1 } = await supabase
    .from('materials')
    .select('id, name, name_ko, cosmetic_allowed, cosmetic_matched_ingredients')
    .or('name.ilike.%편백%,name_ko.ilike.%편백%')
    .limit(2);

  if (e1) { console.error('Error:', e1); return; }
  console.log('편백 조회 결과:');
  console.log(JSON.stringify(materials, null, 2));

  if (!materials || materials.length === 0) {
    console.log('편백 소재 없음');
    return;
  }

  // 단일 조회 (.single())
  const { data: single, error: e2 } = await supabase
    .from('materials')
    .select('*')
    .eq('id', materials[0].id)
    .single();

  if (e2) { console.error('Single error:', e2); return; }
  console.log('\n.select("*") 단일 조회 결과:');
  console.log('cosmetic_allowed:', single?.cosmetic_allowed);
  console.log('cosmetic_matched_ingredients:', single?.cosmetic_matched_ingredients);
}

test();
