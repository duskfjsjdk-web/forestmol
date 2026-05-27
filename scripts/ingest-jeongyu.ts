import fs from 'fs';
import path from 'path';
import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parse } from 'csv-parse/sync';

// .env.local 설정 상자(환경변수) 열기
loadEnvConfig(process.cwd());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const CSV_FILE_PATH = path.join(process.cwd(), 'data', '식물정유은행.csv');

// 필수 설정 검사
if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
  console.error('⚠️ [오류] .env.local 파일에 GEMINI_API_KEY가 설정되지 않았습니다.');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('⚠️ [오류] Supabase URL 또는 ANON_KEY 환경 변수가 부족합니다.');
  process.exit(1);
}

// 도구 상자(클라이언트) 초기화
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// 텍스트를 인공지능이 비교하기 쉽게 768차원의 숫자 지도(임베딩)로 변환해주는 함수
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
  console.log('🌱 [ForestMol] 식물정유은행 CSV 데이터 수집을 시작합니다.');

  // 1. 파일 검증
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`⚠️ [오류] CSV 파일이 존재하지 않습니다: ${CSV_FILE_PATH}`);
    process.exit(1);
  }

  try {
    // 2. 옛날 한글 인코딩(EUC-KR) 파일 읽기 및 현대 한글(UTF-8)로 번역
    const rawBuffer = fs.readFileSync(CSV_FILE_PATH);
    const decoder = new TextDecoder('euc-kr');
    const decodedCsvText = decoder.decode(rawBuffer);

    console.log('📖 CSV 파일 해독 완료. 데이터를 파싱(분석) 중입니다...');

    // 3. csv-parse 모듈을 사용하여 쉼표와 큰따옴표의 규칙을 지키며 데이터 분해
    const records = parse(decodedCsvText, {
      columns: true, // 첫 행을 객체의 키(속성명)로 설정
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    });

    console.log(`📦 파싱 완료! 총 ${records.length}개의 레코드를 발견했습니다.`);

    let totalSaved = 0;

    // 4. 레코드를 하나씩 순회하며 데이터베이스에 저장
    for (let i = 0; i < records.length; i++) {
      const record: any = records[i];

      // 컬럼 매핑 처리
      const name = record['기본정보_국문명'];
      const scientificName = record['기본정보_학명'];
      const distribution = record['기본정보_분포지역'];
      const usageMethod = record['원유식물정보_용도'];
      const effect = record['원유식물정보_효능'];
      
      // 임베딩 검색 능력을 고도화하기 위한 추가 정보 수집
      const ingredients = record['정유정보_성분명'];
      const perfumeNote = record['정유정보_향의 note별 구분 및 특징'];

      // 국문명이 없으면 저장할 수 없으므로 건너뜁니다
      if (!name) {
        console.warn(`⚠️ [경고] ${i + 1}번째 행에 식물 국문명이 누락되어 건너뜁니다.`);
        continue;
      }

      // 임베딩용 요약 텍스트 조립
      const textToEmbed = [
        `식물명: ${name}`,
        scientificName ? `학명: ${scientificName}` : '',
        distribution ? `분포지역: ${distribution}` : '',
        usageMethod ? `용도: ${usageMethod}` : '',
        effect ? `효능: ${effect}` : '',
        ingredients ? `정유 성분: ${ingredients}` : '',
        perfumeNote ? `향기 특징: ${perfumeNote}` : ''
      ].filter(Boolean).join('\n');
      try {
        let embedding: number[] | null = null;
        try {
          // 임베딩 생성 (AI 숫자 지도 변환)
          embedding = await generateEmbedding(textToEmbed);
        } catch (embedError) {
          console.warn(`⚠️ [경고] ${name} 임베딩 생성 실패 (Gemini 쿼터 초과 등). 임베딩 없이 데이터를 먼저 저장합니다.`);
        }

        // 통합 고유 식별자(unique_key) 생성: 식물명 + 데이터출처
        const uniqueKey = `${name}_식물정유은행`;

        // 데이터베이스에 삽입 혹은 덮어쓰기(upsert)
        const { error } = await supabase
          .from('materials')
          .upsert({
            name,
            scientific_name: scientificName || null,
            distribution: distribution || null,
            usage_method: usageMethod || null,
            effect: effect || null,
            herb_name: null, // 정유은행 자료에는 한약재명 없음
            embedding,
            data_source: '식물정유은행',
            unique_key: uniqueKey
          }, {
            onConflict: 'unique_key'
          });

        if (error) {
          console.error(`❌ DB 저장 오류 (${name}):`, error.message);
        } else {
          totalSaved++;
          if (totalSaved % 10 === 0 || totalSaved === records.length) {
            console.log(`✅ [진행률] 현재까지 총 ${totalSaved}/${records.length}건의 소재가 저장되었습니다. (최근: ${name})`);
          }
        }
      } catch (itemError) {
        console.error(`❌ 항목 처리 에러 (${name}):`, itemError);
      }
    }

    console.log(`\n🎉 [수집 완료] 식물정유은행 데이터 총 ${totalSaved}건이 Supabase DB에 정상적으로 보관되었습니다.`);

  } catch (err) {
    console.error('❌ 수집 프로세스 중 치명적인 에러 발생:', err);
  }
}

startIngestion();
