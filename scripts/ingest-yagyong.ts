import fs from 'fs';
import path from 'path';
import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parse } from 'csv-parse/sync';

// .env.local 설정 파일 상자(환경변수) 열기
loadEnvConfig(process.cwd());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const CSV_FILE_PATH = path.join(process.cwd(), 'data', '약용식물생태정보.csv');

// 필수 자물쇠 열쇠(환경변수)들이 있는지 확인합니다.
if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
  console.error('⚠️ [오류] .env.local 파일에 GEMINI_API_KEY가 설정되지 않았습니다.');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('⚠️ [오류] Supabase URL 또는 ANON_KEY 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

// 인터넷 창고(Supabase) 및 인공지능 조력자(OpenAI) 준비하기
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// 글자를 인공지능이 이해할 수 있는 768차원의 '숫자 의미 지도'(임베딩)로 변환해주는 도구
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const response = await model.embedContent(text);
    return response.embedding.values;
  } catch (error) {
    console.error('❌ 임베딩 지도 생성 중 에러 발생:', error);
    throw error;
  }
}

async function startIngestion() {
  console.log('🌱 [ForestMol] 약용식물생태정보 로컬 CSV 파일 수집을 시작합니다.');

  // 1. 수집할 장부에 파일이 실제로 존재하는지 체크
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`⚠️ [오류] 데이터를 가져올 CSV 파일이 없습니다: ${CSV_FILE_PATH}`);
    process.exit(1);
  }

  try {
    // 2. 옛날 한글 편지(EUC-KR) 파일 읽기 및 현대 한글(UTF-8)로 깨짐 없이 번역
    const rawBuffer = fs.readFileSync(CSV_FILE_PATH);
    const decoder = new TextDecoder('euc-kr');
    const decodedCsvText = decoder.decode(rawBuffer);

    console.log('📖 CSV 파일 해독 성공. 쉼표 규칙에 따라 데이터를 조각내어 분석(파싱)합니다...');

    // 3. csv-parse 라이브러리를 사용해 줄바꿈과 따옴표를 지켜 파싱
    const records = parse(decodedCsvText, {
      columns: true, // 첫 줄을 속성명(헤더)으로 지정
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    });

    console.log(`📦 파싱 완료! 총 ${records.length}개의 데이터 행을 분석했습니다.`);

    // 4. 이름이 똑같은 식물이 나타나면 정보를 예쁘게 하나로 합쳐줄 합체기(Merge Map) 생성
    console.log('🔄 동일 식물명 기준 병합(Merge) 프로세스를 시작합니다...');
    const mergedMap = new Map<string, any>();

    for (const recordItem of records) {
      const record = recordItem as any;
      // '약용식물종명'을 식물 이름으로 우선 사용하고, 없으면 '약용식물약재명'을 차선책으로 씁니다.
      const nameKo = record['약용식물종명']?.trim() || record['약용식물약재명']?.trim() || '';
      
      // 이름이 전혀 없는 불량 카드는 건너뜁니다.
      if (!nameKo) {
        continue;
      }

      const nameEn = record['식물종학명']?.trim() || '';
      const species = record['식물종학명']?.trim() || '';
      const region = record['약용식물분포설명']?.trim() || '';

      // 생리활성(bioactivity) 후보 항목들 수집
      const effectDesc = record['약용식물효과설명']?.trim() || '';
      const usageDesc = record['이용방법설명']?.trim() || '';
      const doseDesc = record['약용식물복용방법설명']?.trim() || '';
      
      // 알맹이 글자만 있는 것들만 모아서 바구니(배열)에 담습니다.
      const bioactivity = [effectDesc, usageDesc, doseDesc].filter(Boolean);

      const existing = mergedMap.get(nameKo);
      if (existing) {
        // 이미 맵에 등록된 식물인 경우, 추가 정보를 병합(Merge)합니다.
        
        // 자생지(region) 병합: 쉼표 단위로 쪼개어 중복 없이 다시 합칩니다.
        const existingRegions = existing.region ? existing.region.split(',').map((s: string) => s.trim()) : [];
        const newRegions = region ? region.split(',').map((s: string) => s.trim()) : [];
        const mergedRegions = Array.from(new Set([...existingRegions, ...newRegions])).filter(Boolean).join(', ');
        existing.region = mergedRegions || null;

        // 생리활성(bioactivity) 병합: 겹치는 효능/사용법은 중복 없이 합쳐줍니다.
        existing.bioactivity = Array.from(new Set([...existing.bioactivity, ...bioactivity]));

        // 원본 데이터(raw_data) 병합: 배열 안에 차곡차곡 쌓아놓습니다.
        if (Array.isArray(existing.raw_data)) {
          existing.raw_data.push(record);
        } else {
          existing.raw_data = [existing.raw_data, record];
        }
      } else {
        // 처음 발견된 신규 식물은 새 카드로 등록합니다.
        mergedMap.set(nameKo, {
          name_ko: nameKo,
          name_en: nameEn || null,
          species: species || null,
          region: region || null,
          bioactivity: bioactivity,
          raw_data: record
        });
      }
    }

    const mergedList = Array.from(mergedMap.values());
    console.log(`✨ 병합 완료! 중복 행들을 합쳐 총 ${mergedList.length}개의 고유한 식물 카드로 정돈했습니다.`);

    let totalSaved = 0;

    // 5. 정돈된 식물 정보를 하나씩 읽어 임베딩을 입히고 데이터베이스에 업서트(적재)합니다.
    for (let i = 0; i < mergedList.length; i++) {
      const item = mergedList[i];
      const { name_ko, name_en, species, region, bioactivity, raw_data } = item;

      // 인공지능이 찾아볼 검색용 요약 설명 글 조립
      const textToEmbed = [
        `식물명: ${name_ko}`,
        species ? `학명: ${species}` : '',
        bioactivity.length > 0 ? `효능 및 이용방법: ${bioactivity.join(', ')}` : ''
      ].filter(Boolean).join('\n');

      try {
        let embedding: number[] | null = null;
        try {
          // OpenAI API 호출하여 1536차원의 검색용 지도(임베딩)를 만듭니다.
          embedding = await generateEmbedding(textToEmbed);
        } catch (embedError) {
          console.warn(`⚠️ [경고] ${name_ko} 임베딩 생성에 일시 실패했습니다 (Gemini 한도 도달 등). 텍스트만 먼저 저장합니다.`);
        }

        // 고유 자물쇠(unique_key) 규칙: 식물명_산림청_약용식물
        const uniqueKey = `${name_ko}_산림청_약용식물`;

        // 인터넷 창고(Supabase DB)에 안전하게 넣거나, 이미 있으면 최신 내용으로 교체(Upsert)합니다.
        const { error } = await supabase
          .from('materials')
          .upsert({
            name: name_ko,                // 예전 화면 호환용 식물명
            name_ko: name_ko,
            name_en: name_en || null,
            scientific_name: name_en || null, // 학명 호환용
            species: species || null,
            region: region || null,
            distribution: region || null,     // 자생지 호환용
            bioactivity: bioactivity.length > 0 ? bioactivity : null,
            source_type: '약용소재',
            data_source: '산림청_약용식물',
            source_org: '산림청',
            raw_data: raw_data,           // 병합된 원본(단일 객체 혹은 배열)을 원형 보존
            embedding: embedding,
            unique_key: uniqueKey
          }, {
            onConflict: 'unique_key'     // 고유 이름표가 같은 경우 덮어쓰기 수행
          });

        if (error) {
          console.error(`❌ DB 적재 실패 (${name_ko}):`, error.message);
        } else {
          totalSaved++;
          if (totalSaved % 10 === 0 || totalSaved === mergedList.length) {
            console.log(`✅ [진행현황] ${totalSaved}/${mergedList.length}건의 약용소재가 창고에 보관되었습니다. (최근: ${name_ko})`);
          }
        }

      } catch (itemError) {
        console.error(`❌ [항목 오류] "${name_ko}" 처리 중 오류 발생:`, itemError);
      }
    }

    console.log(`\n🎉 [수집 완료] 중복이 정리된 약용식물 데이터 총 ${totalSaved}건이 Supabase 창고에 안전하게 저장되었습니다.`);

  } catch (err) {
    console.error('❌ 데이터 수집 프로세스 실행 중 예기치 못한 치명적인 오류가 발생했습니다:', err);
  }
}

startIngestion();
