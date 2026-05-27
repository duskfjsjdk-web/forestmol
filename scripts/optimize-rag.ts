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

// 잡음 단어 목록 (추출법 및 식물 부위명)
const noiseKeywords = [
  '추출', '분액', '용매', '조추출물', '조추출', '분획', '에탄올', '메탄올', 
  '물', '헥산', '에틸아세테이트', '부탄올', '잎', '뿌리', '줄기', '수피', '열매', '꽃',
  '가지', '근경', '종자', '과피', '목부', '전초', '껍질', '수액'
];

function cleanBioactivity(bioactivity: string[] | null): string[] | null {
  if (!bioactivity || !Array.isArray(bioactivity)) return null;
  
  const cleaned = bioactivity
    .map(item => item.trim())
    .filter(item => {
      return !noiseKeywords.some(noise => item.includes(noise));
    });
    
  return cleaned.length > 0 ? cleaned : null;
}

// 지수 백오프 기반 단일 임베딩 생성 (한도 초과 방어 장치)
async function generateEmbeddingWithRetry(text: string, retries = 5, delayMs = 3000): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await model.embedContent(text);
      return response.embedding.values;
    } catch (error: any) {
      const isRateLimit = error.message?.includes('429') || error.message?.includes('quota') || error.status === 429;
      
      if (isRateLimit && i < retries - 1) {
        console.warn(`⏳ [Rate Limit] 호출 한도 초과 감지 (${error.message?.substring(0, 80)}). ${delayMs / 1000}초 후 재시도합니다... (시도 ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2;
      } else {
        console.error(`❌ 임베딩 생성 최종 실패:`, error.message || error);
        throw error;
      }
    }
  }
  throw new Error('재시도 횟수 초과');
}

async function optimizeRag() {
  console.log('🌱 [ForestMol] RAG 품질 개선 핀포인트 최적화 작업을 개시합니다.');
  console.log('⏳ 누적된 구글 API 한도 리셋을 위해 최초 30초간 대기 후 실행합니다...');
  await new Promise(resolve => setTimeout(resolve, 30000));

  // 1. 모든 레코드 로드
  const { data: records, error } = await supabase
    .from('materials')
    .select('*');

  if (error) {
    console.error('❌ Supabase 데이터 로드 실패:', error.message);
    return;
  }

  console.log(`📦 총 ${records.length}건의 데이터를 로드했습니다. 정제 및 핵심 표적을 분석합니다...`);

  // 2. bioactivity 내 추출 잡음이 있는 데이터(66건) 및 상위 랭킹 테스트 식물들 선별
  const preparedItems: any[] = [];
  const targetNames = ['금목서', '호장근', '백선', '쇠무릎', '팥꽃나무', '괭이밥', '구상나무', '독일가문비나무', '섬잣나무'];

  records.forEach(record => {
    const { id, name, name_ko, species, bioactivity, compounds, source_org } = record;
    
    const hasExtractionNoise = bioactivity && Array.isArray(bioactivity) && bioactivity.some(item => 
      ['추출', '분액', '용매', '조추출물', '조추출', '분획'].some(noise => item.includes(noise))
    );

    const isTestTarget = targetNames.includes(name_ko || name || '');

    if (hasExtractionNoise || isTestTarget) {
      const cleanedBio = cleanBioactivity(bioactivity);
      const finalName = name_ko || name || '';
      const finalSpecies = species || '';
      const bioactivityStr = cleanedBio ? cleanedBio.join(' ') : '';
      
      let compoundsStr = '';
      if (compounds && Array.isArray(compounds)) {
        compoundsStr = compounds.map((c: any) => c.name || '').filter(Boolean).join(' ');
      }
      
      const finalOrg = source_org || '';
      const textToEmbed = [
        finalName,
        finalSpecies,
        bioactivityStr,
        compoundsStr,
        finalOrg
      ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

      preparedItems.push({
        id,
        name: finalName,
        cleanedBio,
        textToEmbed
      });
    }
  });

  // 중복 ID 제거
  const uniqueItems = Array.from(new Map(preparedItems.map(item => [item.id, item])).values());
  console.log(`🎯 정제 및 임베딩 갱신이 필요한 표적 데이터는 총 ${uniqueItems.length}건입니다.`);

  if (uniqueItems.length === 0) {
    console.log('🎉 이미 모든 bioactivity 데이터가 깔끔하게 정제되어 있습니다!');
    return;
  }

  // 3. 한 건씩 순차 처리하되, 요청 간의 딜레이를 4.5초로 주어 구글 무료 한도(15 RPM)를 완벽히 우회
  const delayMs = 4500;
  let successCount = 0;

  for (let i = 0; i < uniqueItems.length; i++) {
    const item = uniqueItems[i];
    console.log(`\n🔄 [진행] 표적 데이터 ${uniqueItems.length}건 중 ${i + 1}번째 처리 중: ${item.name}`);

    try {
      // 4. 단일 임베딩 생성 (API 요청)
      const embedding = await generateEmbeddingWithRetry(item.textToEmbed);

      // 5. DB 업데이트
      const { error: updateError } = await supabase
        .from('materials')
        .update({
          bioactivity: item.cleanedBio,
          embedding: embedding
        })
        .eq('id', item.id);

      if (updateError) {
        console.error(`❌ DB 업데이트 실패 [이름: ${item.name}]:`, updateError.message);
      } else {
        successCount++;
        console.log(`✅ [성공] ${successCount}/${uniqueItems.length} 건 업데이트 완료!`);
      }

      // 다음 요청이 있으면 4.5초 대기
      if (i < uniqueItems.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

    } catch (err: any) {
      console.error(`❌ "${item.name}" 처리 실패로 건너뜁니다:`, err.message || err);
      // 에러 발생 시 쿼터 진정을 위해 10초 대기
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  console.log(`\n🎉 [최적화 마이그레이션 완료] 총 ${successCount}/${uniqueItems.length}건의 데이터를 정제하고 768차원 임베딩을 재생성했습니다!`);
}

optimizeRag();
