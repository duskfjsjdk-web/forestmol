import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

loadEnvConfig(process.cwd());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ 환경 변수가 누락되었습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function testQuery(queryText: string) {
  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const response = await model.embedContent(queryText);
    const queryEmbedding = response.embedding.values;

    const { data: results, error: searchError } = await supabase.rpc(
      'match_materials',
      {
        query_embedding: queryEmbedding,
        match_threshold: -1,
        match_count: 3 // 상위 3개 결과 출력
      }
    );

    if (searchError) {
      console.error(`❌ DB 검색 오류: ${searchError.message}`);
      return;
    }

    console.log(`\n🔍 검색 질문: "${queryText}"`);
    console.log('======================================================================');

    results?.forEach((item: any, idx: number) => {
      // compounds JSON에서 성분명 최대 3개 조립
      let compoundList: string[] = [];
      if (item.compounds && Array.isArray(item.compounds)) {
        compoundList = item.compounds.slice(0, 3).map((c: any) => c.name || c.name_ko || c.compound_name || '이름 없음');
      }

      const displaySpecies = item.species || item.scientific_name || '정보 없음';
      const displayBioactivity = (item.bioactivity && item.bioactivity.length > 0) 
        ? item.bioactivity.join(', ') 
        : (item.effect ? item.effect.replace(/\r\n/g, ' ').replace(/\n/g, ' ').trim() : '정보 없음');

      console.log(`[${idx + 1}순위] 유사도 점수: ${item.similarity ? item.similarity.toFixed(4) : 'N/A'} (출처: ${item.data_source || '미확인'})`);
      console.log(`🍀 식물 국문명: ${item.name_ko}`);
      console.log(`🔬 학명: ${displaySpecies}`);
      console.log(`💊 생리활성(효능): ${displayBioactivity}`);
      console.log(`🧬 화합물 성분 (최대 3개): ${compoundList.length > 0 ? compoundList.join(', ') : '정보 없음'}`);
      console.log('----------------------------------------------------------------------');
    });
  } catch (err: any) {
    console.error(`❌ 테스트 실패:`, err.message || err);
  }
}

async function runAllTests() {
  const testQueries = [
    "항산화 효능 침엽수 소재",
    "피부 미백 자생식물",
    "항균 산림 추출물"
  ];

  for (const q of testQueries) {
    await testQuery(q);
  }
}

runAllTests();
