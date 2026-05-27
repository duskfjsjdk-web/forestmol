import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// .env.local 환경 변수 상자(설정값) 열기
loadEnvConfig(process.cwd());

const DATA_GO_KR_API_KEY = process.env.DATA_GO_KR_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const API_URL = 'https://api.odcloud.kr/api/15139547/v1/uddi:88c522c3-7653-421b-a596-cfbb3efdd6d0';

// 필수 설정 값 존재 여부 검사
if (!DATA_GO_KR_API_KEY || DATA_GO_KR_API_KEY === 'YOUR_DATA_GO_KR_API_KEY_HERE') {
  console.error('⚠️ [오류] .env.local 파일에 DATA_GO_KR_API_KEY가 설정되지 않았습니다.');
  process.exit(1);
}

if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
  console.error('⚠️ [오류] .env.local 파일에 GEMINI_API_KEY가 설정되지 않았습니다.');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('⚠️ [오류] Supabase URL 또는 ANON_KEY 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

// Supabase 및 Google Gemini 도구 상자(클라이언트) 꺼내기
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// 텍스트를 인공지능이 쉽게 비교하고 검색할 수 있는 768차원의 숫자 지도(임베딩)로 변환해주는 함수
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const response = await model.embedContent(text);
    return response.embedding.values;
  } catch (error) {
    console.error('❌ 임베딩 생성 실패:', error);
    throw error;
  }
}

async function startIngestion() {
  console.log('🌱 [ForestMol] 국립산림과학원 산림바이오소재 API 수집을 시작합니다.');

  let page = 1;
  const perPage = 100;
  let totalSaved = 0;
  let hasMoreData = true;

  while (hasMoreData) {
    console.log(`\n📖 [페이지 ${page}] 데이터를 가져오고 있습니다...`);
    
    // API 호출 주소 완성하기 ( serviceKey 쿼리 파라미터는 인코딩하여 전달합니다 )
    const requestUrl = `${API_URL}?serviceKey=${encodeURIComponent(DATA_GO_KR_API_KEY!)}&page=${page}&perPage=${perPage}`;

    try {
      const response = await fetch(requestUrl);
      if (!response.ok) {
        throw new Error(`HTTP 통신 에러! 상태코드: ${response.status}`);
      }

      const json = await response.json();
      const records = json.data;

      if (!records || records.length === 0) {
        console.log('ℹ️ 불러올 데이터가 더 이상 없습니다. 수집을 정지합니다.');
        break;
      }

      console.log(`📦 이번 페이지에서 ${records.length}건의 데이터를 확인했습니다. DB 적재를 진행합니다.`);

      for (let i = 0; i < records.length; i++) {
        const record = records[i];

        // API 필드 값 읽어오기
        const nameKo = record['식물명']?.trim() || '';
        const nameEn = record['학명']?.trim() || '';
        const species = record['학명']?.trim() || '';
        const region = record['과명']?.trim() || '';
        
        // 생리활성(bioactivity) 필드 배열 조립
        const part = record['추출부위']?.trim() || '';
        const method = record['추출방법']?.trim() || '';
        const detail = record['세부항목']?.trim() || '';
        const bioactivity = [part, method, detail].filter(Boolean);

        // 식물명(국문)은 필수 항목이므로 없을 경우 건너뜁니다
        if (!nameKo) {
          console.warn(`⚠️ [경고] ${i + 1}번째 항목에 식물명이 누락되어 건너뜁니다.`);
          continue;
        }

        // 임베딩 변환용 설명글 합성: 식물명 + 학명 + 추출부위 + 세부항목
        const textToEmbed = [
          `식물명: ${nameKo}`,
          nameEn ? `학명: ${nameEn}` : '',
          part ? `추출부위: ${part}` : '',
          detail ? `세부항목: ${detail}` : ''
        ].filter(Boolean).join('\n');

        // 통합 고유 식별자(unique_key) 생성: 식물명 + 데이터출처 + 식별번호 (없을 시 추출부위+방법+세부항목 조합으로 백업)
        const uniqueId = record['식별번호']?.trim() || '';
        const uniqueKey = uniqueId 
          ? `${nameKo}_산림바이오소재_${uniqueId}` 
          : `${nameKo}_산림바이오소재_${part}_${method}_${detail}`;

        try {
          // 인공지능용 임베딩 생성 (OpenAI API 결제 한도 초과 등에 대비해 예외 처리 구축)
          let embedding: number[] | null = null;
          try {
            embedding = await generateEmbedding(textToEmbed);
          } catch (embedError) {
            console.warn(`⚠️ [경고] ${nameKo} 임베딩 생성 실패 (Gemini 쿼터 초과 등). 임베딩 없이 텍스트 데이터를 먼저 저장합니다.`);
          }

          // 데이터베이스(materials)에 삽입 및 덮어쓰기(upsert)
          const { error } = await supabase
            .from('materials')
            .upsert({
              name: nameKo,                // 기존 고유식별을 위한 name 컬럼 매핑
              name_ko: nameKo,
              name_en: nameEn || null,
              species: species || null,
              region: region || null,
              bioactivity: bioactivity.length > 0 ? bioactivity : null,
              raw_data: record,            // 전체 응답 JSON을 원형 그대로 저장
              data_source: '산림바이오소재',
              source_org: '국립산림과학원',
              embedding,
              unique_key: uniqueKey
            }, {
              onConflict: 'unique_key'
            });

          if (error) {
            console.error(`❌ DB 저장 실패 (${nameKo}):`, error.message);
          } else {
            totalSaved++;
            if (totalSaved % 10 === 0 || totalSaved === json.totalCount) {
              console.log(`✅ [진행률] 현재까지 총 ${totalSaved}/${json.totalCount}건의 소재가 저장되었습니다. (최근: ${nameKo})`);
            }
          }

        } catch (itemError) {
          console.error(`❌ [항목 처리 에러] 식물명 "${nameKo}" 처리 중 오류 발생:`, itemError);
        }
      }

      // 수집한 개수가 전체 수(totalCount)에 도달했거나 perPage보다 작다면 루프를 마칩니다.
      if (totalSaved >= json.totalCount || records.length < perPage) {
        console.log('ℹ️ 모든 데이터가 성공적으로 처리되었습니다. 수집을 마칩니다.');
        hasMoreData = false;
      } else {
        page++;
      }

    } catch (err) {
      console.error(`❌ [심각한 에러] 페이지 ${page} 처리 중 오류 발생:`, err);
      hasMoreData = false;
    }
  }

  console.log(`\n🎉 [수집 완료] 산림바이오소재 데이터 총 ${totalSaved}건이 Supabase DB에 무사히 저장되었습니다.`);
}

startIngestion();
