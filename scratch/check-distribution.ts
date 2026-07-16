import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function check() {
  const samples = [
    { name: '잣나무', filter: '산림청_약용식물' },
    { name: '편백', filter: '식물정유은행' },
    { name: '광나무', filter: '산림바이오소재' },
  ];

  for (const s of samples) {
    const { data } = await supabase
      .from('materials')
      .select('name, data_source, distribution, raw_data')
      .ilike('name', `%${s.name}%`)
      .ilike('data_source', `%${s.filter.split('_')[1] || s.filter}%`)
      .limit(1);

    const m = data?.[0];
    console.log(`\n=== ${s.name} (${s.filter}) ===`);
    console.log('distribution:', m?.distribution);
    if (m?.raw_data) {
      const keys = typeof m.raw_data === 'object' ? Object.keys(m.raw_data) : [];
      const distKeys = keys.filter(k => k.includes('분포') || k.includes('자생') || k.includes('분산') || k.includes('지역') || k.includes('distribution'));
      console.log('raw_data 전체 keys:', keys.join(', '));
      console.log('분포 관련 keys:', distKeys);
      distKeys.forEach(k => console.log(`  raw_data.${k}:`, m.raw_data[k]));
    } else {
      console.log('raw_data: null/없음');
    }
  }
}

check();
