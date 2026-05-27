import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import xml2js from 'xml2js';

// .env.local 환경 변수 로드 (설정 파일 열기)
loadEnvConfig(process.cwd());

const DATA_GO_KR_API_KEY = process.env.DATA_GO_KR_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const API_ENDPOINT = 'http://api.forest.go.kr/openapi/service/mclltInfoService/getMclltSearch';

// 누락된 환경 변수 검사
if (!DATA_GO_KR_API_KEY || DATA_GO_KR_API_KEY === 'YOUR_DATA_GO_KR_API_KEY_HERE') {
  console.error('⚠️ [오류] .env.local 파일에 DATA_GO_KR_API_KEY를 설정해 주세요.');
  process.exit(1);
}

if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
  console.error('⚠️ [오류] .env.local 파일에 GEMINI_API_KEY를 설정해 주세요.');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('⚠️ [오류] Supabase URL 또는 ANON_KEY 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

// Supabase 및 Google Gemini 클라이언트 객체 생성 (도구 준비)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// JSON 파싱 중 값 검출을 돕는 보조 함수
function getValue(item: any, possibleKeys: string[]): string {
  for (const key of possibleKeys) {
    if (item[key] !== undefined && item[key] !== null) {
      const val = item[key];
      if (typeof val === 'string') return val.trim();
      if (typeof val === 'number') return String(val);
      if (Array.isArray(val)) {
        if (val.length > 0 && typeof val[0] === 'string') return val[0].trim();
      }
    }
  }
  return '';
}

// 텍스트를 인공지능이 이해할 수 있는 768차원의 임베딩 벡터로 변환하는 함수
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const response = await model.embedContent(text);
    return response.embedding.values;
  } catch (error) {
    console.error('❌ 임베딩 벡터 생성 중 에러 발생:', error);
    throw error;
  }
}

async function startIngestion() {
  console.log('🌱 [ForestMol] 산림청 약용식물 데이터 수집을 시작합니다. (xml2js 파서 사용)');
  
  let pageNo = 1;
  const numOfRows = 100;
  let totalSaved = 0;
  let hasMoreData = true;

  while (hasMoreData) {
    console.log(`\n==================================================`);
    console.log(`📖 [페이지 ${pageNo}] 데이터를 요청하고 있습니다...`);
    console.log(`==================================================`);

    // API 호출 주소 조립 (디코딩 키에 들어있는 특수문자가 찌그러지지 않도록 encodeURIComponent를 제거하고 그대로 붙여 보냅니다)
    const requestUrl = `${API_ENDPOINT}?serviceKey=${DATA_GO_KR_API_KEY}&pageNo=${pageNo}&numOfRows=${numOfRows}`;

    try {
      const response = await fetch(requestUrl);
      if (!response.ok) {
        throw new Error(`HTTP 통신 실패! 상태코드: ${response.status}`);
      }

      const xmlText = await response.text();
      
      // 첫 페이지 수집 시, 응답 구조 파악을 위해 XML 응답의 일부를 출력합니다.
      if (pageNo === 1) {
        console.log('🔍 [구조 검증] API 응답 원본 (상위 500자):');
        console.log(xmlText.substring(0, 500));
        console.log('--------------------------------------------------');
      }

      // xml2js를 사용하여 XML 텍스트를 JSON 객체로 파싱합니다.
      // explicitArray: false 옵션을 주어 단일 요소를 불필요한 배열로 감싸지 않도록 처리합니다.
      const parsedData = await xml2js.parseStringPromise(xmlText, {
        explicitArray: false,
        trim: true
      });

      const itemsContainer = parsedData.response?.body?.items;
      
      if (!itemsContainer || itemsContainer === '') {
        console.log('ℹ️ 더 이상 불러올 데이터가 없거나 응답이 비어있습니다. 수집을 정지합니다.');
        hasMoreData = false;
        break;
      }

      let itemRaw = itemsContainer.item;
      if (!itemRaw) {
        console.log('ℹ️ 이번 페이지에 식물 정보 항목(item)이 없습니다. 수집을 정지합니다.');
        hasMoreData = false;
        break;
      }

      // 단일 데이터와 다중 데이터 구분 없이 배열로 정규화합니다.
      const items = Array.isArray(itemRaw) ? itemRaw : [itemRaw];
      
      if (items.length === 0) {
        console.log('ℹ️ 수집할 식물 정보 항목이 비어있습니다. 수집을 정지합니다.');
        hasMoreData = false;
        break;
      }

      console.log(`📦 이번 페이지에서 ${items.length}건의 데이터를 파싱했습니다. 저장을 시작합니다.`);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // 다양한 필드 명칭 후보들에 대비하여 값을 추출합니다.
        const name = getValue(item, ['fnm', 'plantName', 'plantNm', 'koreanName', 'prtName']);
        const scientificName = getValue(item, ['scnm', 'sciName', 'scientificName', 'ptctSciName']);
        const distribution = getValue(item, ['distr', 'distribution', 'distributionArea', 'ptctDistr']);
        const effect = getValue(item, ['efct', 'effect', 'usageEffect', 'ptctEfct']);
        const herbName = getValue(item, ['hbnm', 'herbName', 'medicineName', 'ptctHbnm']);

        // 식물명(국문)은 고유 키이자 필수 값이므로, 없을 경우 건너뜁니다.
        if (!name) {
          console.warn(`⚠️ [경고] ${i + 1}번째 항목에 식물 국문명이 누락되어 수집을 건너뜁니다.`);
          continue;
        }

        // 임베딩할 설명글 합성
        const textToEmbed = [
          `식물명: ${name}`,
          scientificName ? `학명: ${scientificName}` : '',
          herbName ? `약재명: ${herbName}` : '',
          distribution ? `분포지역: ${distribution}` : '',
          effect ? `이용효과: ${effect}` : ''
        ].filter(Boolean).join('\n');

        try {
          let embedding: number[] | null = null;
          try {
            // 인공지능 임베딩 생성
            embedding = await generateEmbedding(textToEmbed);
          } catch (embedError) {
            console.warn(`⚠️ [경고] ${name} 임베딩 생성 실패 (Gemini 쿼터 초과 등). 임베딩 없이 데이터를 먼저 저장합니다.`);
          }

          // 통합 고유 식별자(unique_key) 생성: 식물명 + 데이터출처
          const uniqueKey = `${name}_산림청_약용식물`;

          // 데이터베이스에 삽입 혹은 기존 정보 덮어쓰기(upsert)
          const { error } = await supabase
            .from('materials')
            .upsert({
              name,
              name_ko: name,
              scientific_name: scientificName || null,
              distribution: distribution || null,
              effect: effect || null,
              herb_name: herbName || null,
              embedding,
              data_source: '산림청_약용식물',
              unique_key: uniqueKey
            }, {
              onConflict: 'unique_key'
            });

          if (error) {
            console.error(`❌ 데이터베이스 저장 실패 (${name}):`, error.message);
          } else {
            totalSaved++;
            if (totalSaved % 10 === 0) {
              console.log(`✅ 현재까지 총 ${totalSaved}건의 소재를 데이터베이스에 저장 완료했습니다. (최근 저장: ${name})`);
            }
          }
        } catch (itemError) {
          console.error(`❌ [항목 처리 에러] 식물명 "${name}" 처리 도중 에러가 발생했습니다:`, itemError);
          // 개별 아이템 에러로 인해 전체 수집이 중단되지 않도록 다음으로 넘어갑니다.
        }
      }

      pageNo++;

      // 수집한 건수가 한 페이지당 크기(numOfRows)보다 적다면 마지막 페이지로 판단합니다.
      if (items.length < numOfRows) {
        console.log('ℹ️ 마지막 페이지에 다다랐습니다. 수집을 성공적으로 정지합니다.');
        hasMoreData = false;
      }
      
    } catch (error) {
      console.error(`❌ [심각한 에러] 페이지 ${pageNo} 수집 및 처리 과정 중 에러 발생:`, error);
      hasMoreData = false;
    }
  }

  console.log(`\n🎉 [수집 완료] 총 ${totalSaved}건의 약용식물 소재 데이터가 Supabase DB에 정상적으로 저장되었습니다.`);
}

startIngestion();
