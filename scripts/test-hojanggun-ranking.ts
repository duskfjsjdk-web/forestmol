import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

loadEnvConfig(process.cwd());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);

async function testHojanggunRanking() {
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
  
  // 1. "항염 항산화 산림 소재" 검색 유사도 테스트
  const q1 = "항염 항산화 산림 소재";
  const res1 = await model.embedContent({
    content: { role: 'user', parts: [{ text: q1 }] },
    outputDimensionality: 768,
  } as any);
  const emb1 = res1.embedding.values;

  const { data: results1 } = await supabase.rpc('match_materials', {
    query_embedding: emb1,
    match_threshold: -1,
    match_count: 10
  });

  console.log(`\n🔍 "${q1}" 검색 결과:`);
  results1?.forEach((item: any, idx: number) => {
    console.log(`[${idx + 1}위] 유사도: ${item.similarity.toFixed(4)} - ${item.name_ko} (${item.data_source})`);
  });

  // 2. "호장근" 직접 검색 유사도 테스트
  const q2 = "호장근";
  const res2 = await model.embedContent({
    content: { role: 'user', parts: [{ text: q2 }] },
    outputDimensionality: 768,
  } as any);
  const emb2 = res2.embedding.values;

  const { data: results2 } = await supabase.rpc('match_materials', {
    query_embedding: emb2,
    match_threshold: -1,
    match_count: 5
  });

  console.log(`\n🔍 "${q2}" 검색 결과:`);
  results2?.forEach((item: any, idx: number) => {
    console.log(`[${idx + 1}위] 유사도: ${item.similarity.toFixed(4)} - ${item.name_ko} (${item.data_source})`);
  });
}

testHojanggunRanking();
