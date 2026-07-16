import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function check() {
  // 편백 (식물정유은행)
  const { data: pyunbaek } = await supabase
    .from('materials')
    .select('name, data_source, usage_method, bioactivity')
    .or('name.ilike.%편백%,name_ko.ilike.%편백%')
    .limit(1);
  console.log('=== 편백 (식물정유은행) ===');
  console.log('data_source:', pyunbaek?.[0]?.data_source);
  console.log('usage_method:\n', pyunbaek?.[0]?.usage_method);
  console.log('bioactivity:', JSON.stringify(pyunbaek?.[0]?.bioactivity, null, 2));

  // 잣나무 (약용식물)
  const { data: jat } = await supabase
    .from('materials')
    .select('name, data_source, usage_method, bioactivity')
    .or('name.ilike.%잣나무%,name_ko.ilike.%잣나무%')
    .not('data_source', 'ilike', '%정유%')
    .limit(1);
  console.log('\n=== 잣나무 (약용식물) ===');
  console.log('data_source:', jat?.[0]?.data_source);
  console.log('usage_method:\n', jat?.[0]?.usage_method?.substring(0, 300));
  console.log('bioactivity:', JSON.stringify(jat?.[0]?.bioactivity, null, 2));
}

check();
