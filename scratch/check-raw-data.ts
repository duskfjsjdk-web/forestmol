import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkRawData() {
  // 편백 (식물정유은행 데이터)
  const { data: pyunbaek } = await supabase
    .from('materials')
    .select('name, data_source, raw_data, usage_method')
    .or('name.ilike.%편백%,name_ko.ilike.%편백%')
    .limit(1);

  console.log('=== 편백 raw_data ===');
  if (pyunbaek?.[0]) {
    console.log('data_source:', pyunbaek[0].data_source);
    console.log('raw_data keys:', pyunbaek[0].raw_data ? Object.keys(pyunbaek[0].raw_data) : 'null');
    console.log('raw_data:', JSON.stringify(pyunbaek[0].raw_data, null, 2));
    console.log('usage_method (first 200):', pyunbaek[0].usage_method?.substring(0, 200));
  }

  // 산림바이오소재 데이터 샘플
  const { data: bio } = await supabase
    .from('materials')
    .select('name, data_source, raw_data, usage_method')
    .ilike('data_source', '%바이오소재%')
    .not('raw_data', 'is', null)
    .limit(2);

  console.log('\n=== 산림바이오소재 raw_data ===');
  bio?.forEach(m => {
    console.log('\nname:', m.name, '| source:', m.data_source);
    console.log('raw_data keys:', m.raw_data ? Object.keys(m.raw_data) : 'null');
    console.log('raw_data:', JSON.stringify(m.raw_data, null, 2));
  });

  // 약용식물 (잣나무) 확인
  const { data: jat } = await supabase
    .from('materials')
    .select('name, data_source, raw_data, usage_method')
    .or('name.ilike.%잣%,name_ko.ilike.%잣%')
    .limit(1);

  console.log('\n=== 잣나무 raw_data ===');
  if (jat?.[0]) {
    console.log('data_source:', jat[0].data_source);
    console.log('raw_data keys:', jat[0].raw_data ? Object.keys(jat[0].raw_data) : 'null');
    console.log('raw_data:', JSON.stringify(jat[0].raw_data, null, 2));
    console.log('usage_method (first 200):', jat[0].usage_method?.substring(0, 200));
  }
}

checkRawData();
