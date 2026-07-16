import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

loadEnvConfig(process.cwd());
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function search() {
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
  const response = await model.embedContent({ content: { role: 'user', parts: [{ text: '편백' }] }, outputDimensionality: 768 } as any);
  
  const { data, error } = await supabase.rpc('match_materials', {
    query_embedding: response.embedding.values,
    match_threshold: -1,
    match_count: 5
  });

  if (error) {
    console.error(error);
    return;
  }
  console.log('=== 편백 검색 결과 ===');
  data.forEach((d: any, i: number) => {
    console.log(`${i+1}위: ${d.name_ko || d.name} (유사도: ${d.similarity.toFixed(4)}) - ${d.data_source}`);
  });
}
search();
