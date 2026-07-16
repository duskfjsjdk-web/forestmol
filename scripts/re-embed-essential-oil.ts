import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

loadEnvConfig(process.cwd());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ 필수 환경 변수가 누락되었습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function generateEmbeddingWithRetry(text: string, retries = 7, delayMs = 2000): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await model.embedContent({
        content: { role: 'user', parts: [{ text }] },
        outputDimensionality: 768,
      } as any);
      return response.embedding.values;
    } catch (error: any) {
      const isRateLimit = error.message?.includes('429') || error.message?.includes('quota') || error.status === 429;
      
      if (isRateLimit && i < retries - 1) {
        console.warn(`⏳ [Rate Limit] ${delayMs / 1000}초 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2;
      } else {
        console.error(`❌ 임베딩 생성 실패:`, error.message || error);
        throw error;
      }
    }
  }
  throw new Error('재시도 횟수 초과');
}

async function reEmbedEssentialOil() {
  console.log('🤖 식물정유은행 임베딩 재생성 작업을 시작합니다.');

  const { data: records, error } = await supabase
    .from('materials')
    .select('id, name, name_ko, scientific_name, usage_method, compounds')
    .eq('data_source', '식물정유은행');

  if (error || !records) {
    console.error('❌ 데이터 조회 실패:', error?.message);
    return;
  }

  console.log(`📦 총 ${records.length}건의 데이터를 처리합니다.`);

  // 텍스트 조합
  const texts = records.map(record => {
    const { name, name_ko, scientific_name, usage_method, compounds } = record;
    const displayName = name_ko || name || '';
    const usageStr = usage_method ? usage_method.replace(/■/g, '').replace(/\n/g, ' ').trim() : '';
    const compNames = (compounds || []).map((c: any) => c.name_ko || c.name || c.cas || c.cas_no).filter(Boolean).join(', ');
    return [displayName, scientific_name || '', usageStr, compNames].filter(Boolean).join(' ');
  });

  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
  const batchSize = 50;
  for (let i = 0; i < records.length; i += batchSize) {
    const batchRecords = records.slice(i, i + batchSize);
    const batchTexts = texts.slice(i, i + batchSize);
    
    try {
      const response = await model.batchEmbedContents({
        requests: batchTexts.map(text => ({
          model: 'models/gemini-embedding-001',
          content: { role: 'user', parts: [{ text }] },
          outputDimensionality: 768
        }))
      } as any);

      const embeddings = response.embeddings;
      
      for (let j = 0; j < batchRecords.length; j++) {
        const record = batchRecords[j];
        const embedding = embeddings[j].values;
        await supabase.from('materials').update({ embedding }).eq('id', record.id);
      }
      console.log(`✅ ${i + batchRecords.length}건 처리 완료`);
    } catch (e: any) {
      console.error(`❌ 배치 처리 실패: ${e.message}`);
    }
  }

  console.log(`\n🎉 식물정유은행 임베딩 재생성을 완료했습니다!`);
}

reEmbedEssentialOil();
