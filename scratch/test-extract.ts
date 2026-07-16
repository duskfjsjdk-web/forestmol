import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testExtract() {
  const { data } = await supabase
    .from('materials')
    .select('name, usage_method, compounds')
    .eq('data_source', '식물정유은행')
    .limit(10);
    
  if (data) {
    for (const d of data) {
      const keywords = [];
      if (d.usage_method) {
        const lines = d.usage_method.split('■').filter(Boolean);
        for (const line of lines) {
          const match = line.match(/^\s*(.+?)\s*\(/);
          if (match && match[1].length < 20) {
            keywords.push(match[1].trim());
          }
        }
      }
      
      const compNames = (d.compounds || []).map((c: any) => c.name || c.name_ko).filter(Boolean);
      
      console.log(`[${d.name}]`);
      console.log(`usage: ${d.usage_method?.substring(0, 50)}...`);
      console.log(`keywords:`, keywords);
      console.log(`compounds:`, compNames.slice(0, 5));
      console.log('---');
    }
  }
}
testExtract();
