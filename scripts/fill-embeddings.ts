import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// .env.local 환경 변수 로드
loadEnvConfig(process.cwd());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ 필수 환경 변수가 누락되었습니다. (.env.local 파일을 확인해 주세요)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// 지수 백오프 기반의 재시도 기능이 내장된 임베딩 생성 함수
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
        console.warn(`⏳ [Rate Limit] 호출 한도 초과 감지. ${delayMs / 1000}초 후 재시도합니다... (시도 ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2; // 대기 시간 2배로 증가 (지수 백오프)
      } else {
        console.error(`❌ 임베딩 생성 최종 실패:`, error.message || error);
        throw error;
      }
    }
  }
  throw new Error('재시도 횟수 초과');
}

async function fillMissingEmbeddings() {
  console.log('🤖 [ForestMol] 누락된 Gemini 임베딩 복구 프로세스를 시작합니다.');

  // 1. 임베딩이 null인 데이터 가져오기
  const { data: missingRecords, error } = await supabase
    .from('materials')
    .select('*')
    .is('embedding', null);

  if (error) {
    console.error('❌ Supabase 데이터 조회 실패:', error.message);
    return;
  }

  if (!missingRecords || missingRecords.length === 0) {
    console.log('🎉 모든 데이터에 임베딩이 가득 차 있습니다! 작업할 필요가 없습니다.');
    return;
  }

  console.log(`📦 임베딩이 누락된 데이터를 ${missingRecords.length}건 발견했습니다. 복구를 시작합니다.`);

  let successCount = 0;

  for (let i = 0; i < missingRecords.length; i++) {
    const record = missingRecords[i];
    const { id, name, scientific_name, distribution, effect, herb_name, data_source, raw_data } = record;

    // 2. 데이터 출처별 최적의 설명 텍스트 조립
    let textToEmbed = '';
    
    if (data_source === '식물정유은행') {
      const raw = raw_data as any;
      const ingredients = raw?.['정유정보_성분명'] || '';
      const perfumeNote = raw?.['정유정보_향의 note별 구분 및 특징'] || '';
      
      textToEmbed = [
        `식물명: ${name}`,
        scientific_name ? `학명: ${scientific_name}` : '',
        distribution ? `분포지역: ${distribution}` : '',
        record.usage_method ? `용도: ${record.usage_method}` : '',
        effect ? `효능: ${effect}` : '',
        ingredients ? `정유 성분: ${ingredients}` : '',
        perfumeNote ? `향기 특징: ${perfumeNote}` : ''
      ].filter(Boolean).join('\n');
      
    } else if (data_source === '산림바이오소재') {
      const raw = raw_data as any;
      const part = raw?.['추출부위'] || '';
      const detail = raw?.['세부항목'] || '';
      
      textToEmbed = [
        `식물명: ${name}`,
        scientific_name ? `학명: ${scientific_name}` : '',
        part ? `추출부위: ${part}` : '',
        detail ? `세부항목: ${detail}` : ''
      ].filter(Boolean).join('\n');
      
    } else {
      // 산림청_약용식물 또는 기타
      textToEmbed = [
        `식물명: ${name}`,
        scientific_name ? `학명: ${scientific_name}` : '',
        herb_name ? `약재명: ${herb_name}` : '',
        distribution ? `분포지역: ${distribution}` : '',
        effect ? `이용효과: ${effect}` : ''
      ].filter(Boolean).join('\n');
    }

    try {
      // 3. 지수 백오프 기반 임베딩 구하기
      const embedding = await generateEmbeddingWithRetry(textToEmbed);
      
      // 4. Supabase DB 업데이트
      const { error: updateError } = await supabase
        .from('materials')
        .update({ embedding })
        .eq('id', id);

      if (updateError) {
        console.error(`❌ DB 업데이트 실패 [ID: ${id}, 이름: ${name}]:`, updateError.message);
      } else {
        successCount++;
        console.log(`✅ [${successCount}/${missingRecords.length}] 성공: ${name} (${data_source})`);
      }
      
      // API 매너 타임 (기본 300ms 쉬어가기)
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (err) {
      console.error(`❌ [복구 실패] 식물명 "${name}" 처리 중 에러가 발생하여 스킵합니다.`);
    }
  }

  console.log(`\n🎉 [복구 작업 완료] 총 ${successCount}건의 누락된 임베딩을 성공적으로 채웠습니다!`);
}

fillMissingEmbeddings();
