import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

loadEnvConfig(process.cwd());
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function run() {
  const { data: records } = await supabase
    .from('materials')
    .select('id, name, name_ko, scientific_name, usage_method, compounds')
    .eq('data_source', '식물정유은행')
    .eq('name', '편백');

  if (!records) return;

  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

  for (const record of records) {
    const { id, name, name_ko, scientific_name, usage_method, compounds } = record;
    const displayName = name_ko || name || '';
    const usageStr = usage_method ? usage_method.replace(/■/g, '').replace(/\n/g, ' ').trim() : '';
    const compNames = (compounds || []).map((c: any) => c.name_ko || c.name || c.cas || c.cas_no).filter(Boolean).join(', ');
    const textToEmbed = [displayName, scientific_name || '', usageStr, compNames].filter(Boolean).join(' ');

    let success = false;
    let delay = 2000;
    while (!success) {
      try {
        const response = await model.embedContent({ content: { role: 'user', parts: [{ text: textToEmbed }] }, outputDimensionality: 768 } as any);
        await supabase.from('materials').update({ embedding: response.embedding.values }).eq('id', id);
        console.log(`✅ 편백 업데이트 완료: ${id}`);
        success = true;
      } catch (e: any) {
        console.log(`Rate limit, waiting ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        if (delay > 30000) break;
      }
    }
  }
}
run();
