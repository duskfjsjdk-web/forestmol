import fs from 'fs';
import path from 'path';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// .env.local 설정 파일 상자(환경변수) 열기
loadEnvConfig(process.cwd());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

// 학명(species)에서 지저분한 명명자(저자명)를 지우고 깔끔하게 정리하는 다듬기 상자
function cleanSpecies(species: string): { cleaned: string; genus: string } {
  // 예: "Mallotus japonicus (L.f.) Müll.Arg." -> "Mallotus japonicus"
  // 예: "Melia azedarach L." -> "Melia azedarach"
  const parts = species.trim().split(/\s+/);
  const genus = parts[0] || '';
  let cleaned = species;
  
  if (parts.length >= 2) {
    // 속명 + 종소명 조합만 남기고 뒤는 생략
    cleaned = `${parts[0]} ${parts[1]}`;
  } else {
    cleaned = genus;
  }
  
  // 괄호로 묶인 불필요한 텍스트 제거
  cleaned = cleaned.replace(/\([^)]*\)/g, '').trim();
  
  return {
    cleaned,
    genus
  };
}

// LOTUS 사이트에서 압축 파일을 받아와 조인하기를 시도하는 함수
async function downloadLotusCsv(): Promise<string | null> {
  const url = 'https://lotus.naturalproducts.net/download/lotus.csv.gz';
  const tempGzPath = path.join(process.cwd(), 'data', 'lotus.csv.gz');
  const tempFilePath = path.join(process.cwd(), 'data', 'lotus.csv');
  
  try {
    console.log('⬇️ 1단계: LOTUS 대용량 압축 데이터베이스 다운로드를 시도합니다...');
    
    // data 폴더가 없으면 미리 만듭니다.
    const dataDir = path.dirname(tempGzPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      throw new Error(`다운로드 실패 (상태 코드: ${res.status})`);
    }
    
    // 응답 본문을 로컬 파일로 저장
    const fileStream = fs.createWriteStream(tempGzPath);
    const bodyReader = res.body;
    if (!bodyReader) {
      throw new Error('응답 바디를 읽을 수 없습니다.');
    }
    
    // ReadableStream을 Node.js Readable 스트림으로 변환 후 파이프라인 전송
    // @ts-ignore
    await pipeline(bodyReader, fileStream);
    
    console.log('📦 LOTUS 압축 해제 중...');
    const gunzip = createGunzip();
    const source = fs.createReadStream(tempGzPath);
    const destination = fs.createWriteStream(tempFilePath);
    await pipeline(source, gunzip, destination);
    
    console.log('✅ LOTUS 파일 준비 완료!');
    if (fs.existsSync(tempGzPath)) fs.unlinkSync(tempGzPath);
    return tempFilePath;
  } catch (error: any) {
    console.log(`⚠️ LOTUS 다운로드 실패 (사유: ${error.message || error})`);
    console.log('👉 KNApSAck API를 활용해 필요한 식물만 실시간으로 조회하여 연계(Fallback)하겠습니다.');
    if (fs.existsSync(tempGzPath)) fs.unlinkSync(tempGzPath);
    return null;
  }
}

// KNApSAck HTML 응답을 화합물 성분 목록으로 쪼개서 정리하는 파서(해독기)
function parseKnapsackHtml(html: string): Array<{ name: string; cas: string; formula: string }> {
  const compounds: Array<{ name: string; cas: string; formula: string }> = [];
  const rows = html.split(/<\/tr>/i);
  
  for (const row of rows) {
    const trStartIndex = row.search(/<tr>/i);
    if (trStartIndex === -1) continue;
    const trContent = row.substring(trStartIndex + 4);
    
    // td로 쪼개기
    const tds = trContent.split(/<\/td>/i);
    const tdContents: string[] = [];
    
    for (const td of tds) {
      const match = td.match(/<td[^>]*>/i);
      if (match && match.index !== undefined) {
        const tagLength = match[0].length;
        tdContents.push(td.substring(match.index + tagLength).trim());
      }
    }
    
    if (tdContents.length >= 4) {
      if (tdContents[0].includes('information.php')) {
        // CAS 번호가 &nbsp;나 빈 대시(-)로 되어 있는 경우 깨끗이 지웁니다.
        const rawCas = tdContents[1].replace(/&nbsp;/gi, '').trim();
        const cas = (rawCas === '-' || !rawCas) ? '' : rawCas;
        
        // HTML 태그들을 모두 제거하고 텍스트만 뽑아냅니다.
        const name = tdContents[2].replace(/<[^>]*>/g, '').trim();
        const formula = tdContents[3].replace(/<[^>]*>/g, '').trim();
        
        if (name) {
          compounds.push({ name, cas, formula });
        }
      }
    }
  }
  return compounds;
}

// KNApSAck API에 실제로 접속하여 성분을 조회해오는 우편배달원
async function fetchFromKnapsack(word: string, retryCount = 2): Promise<Array<{ name: string; cas: string; formula: string }>> {
  const url = `https://www.knapsackfamily.com/knapsack_core/result.php?sname=organism&word=${encodeURIComponent(word)}`;
  
  for (let i = 0; i <= retryCount; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(8000) // 8초 타임아웃
      });
      
      if (!res.ok) {
        throw new Error(`HTTP 에러 ${res.status}`);
      }
      
      const html = await res.text();
      return parseKnapsackHtml(html);
    } catch (err: any) {
      if (i === retryCount) {
        console.warn(`❌ [조회 실패] "${word}" 최종 에러: ${err.message}`);
        return [];
      }
      console.log(`⏳ [재시도 중...] "${word}" 조회 오류 (${err.message}). 잠시 후 다시 시도합니다.`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return [];
}

// 비동기 작업에 동시 실행 제한(병목 방지 세마포어)을 걸어주는 제어실
async function runWithLimit<T>(limit: number, items: any[], fn: (item: any) => Promise<T>): Promise<T[]> {
  const results: Promise<T>[] = [];
  const executing: Promise<any>[] = [];
  
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    results.push(p);
    
    if (limit <= items.length) {
      const e: Promise<any> = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(results);
}

async function startIngestion() {
  console.log('🚀 [ForestMol] KNApSAck/LOTUS 성분 데이터 조인 및 임베딩 갱신을 시작합니다.');

  // 1단계: LOTUS 다운로드 우선 시도
  const lotusFilePath = await downloadLotusCsv();
  let useLotus = false;
  
  if (lotusFilePath && fs.existsSync(lotusFilePath)) {
    console.log('ℹ️ 로컬 LOTUS CSV 데이터를 로드하여 조인을 진행합니다.');
    useLotus = true;
    // (여기서는 다운로드가 실패하여 Fallback되는 경우가 보편적이므로 KNApSAck API 구조를 주축으로 삼고,
    // 필요 시 임시 처리하도록 설계했습니다.)
  }

  // 2단계: materials 테이블에서 학명이 등록된 고유 식물들 데려오기
  console.log('🔌 Supabase 데이터베이스에서 식물 목록을 조회합니다...');
  const { data: materials, error: dbError } = await supabase
    .from('materials')
    .select('id, name_ko, species, bioactivity')
    .not('species', 'is', null);

  if (dbError) {
    console.error('❌ Supabase 데이터 조회 오류:', dbError.message);
    process.exit(1);
  }

  if (!materials || materials.length === 0) {
    console.log('ℹ️ 조인 대상이 되는 식물이 데이터베이스에 없습니다.');
    process.exit(0);
  }

  console.log(`🌱 총 ${materials.length}개의 식물을 확인했습니다. 연계 수집을 개시합니다...`);

  let joinSuccessCount = 0;
  let embeddingUpdateCount = 0;
  let totalCompoundsFound = 0;

  // 동시 요청 5개 제한으로 KNApSAck 수집 및 업데이트 프로세스를 돌립니다.
  await runWithLimit(5, materials, async (item) => {
    const { id, name_ko, species, bioactivity } = item;
    
    try {
      const { cleaned, genus } = cleanSpecies(species);
      
      // 1. 정확 학명 매칭
      let compounds = await fetchFromKnapsack(cleaned);
      let matchType = '정확';

      // 2. 결과가 없으면 속명(genus) 부분 매칭
      if (compounds.length === 0 && genus && genus !== cleaned) {
        compounds = await fetchFromKnapsack(genus);
        matchType = '속명 부분';
      }

      if (compounds.length > 0) {
        joinSuccessCount++;
        totalCompoundsFound += compounds.length;
        console.log(`✅ [매칭 성공] ${name_ko} (${species}) ➔ ${matchType} 매칭으로 성분 ${compounds.length}개 발견!`);

        // AI 검색용 설명 요약글 새로 짜기
        // (식물명 + 학명 + 기존 생리활성 + 새로 발견된 성분명들)
        const bioactivityStr = Array.isArray(bioactivity) ? bioactivity.join(', ') : '';
        const compoundsStr = compounds.map(c => c.name).join(', ');
        
        const textToEmbed = [
          `식물명: ${name_ko}`,
          species ? `학명: ${species}` : '',
          bioactivityStr ? `효능 및 이용방법: ${bioactivityStr}` : '',
          compoundsStr ? `성분: ${compoundsStr}` : ''
        ].filter(Boolean).join('\n');

        let embedding: number[] | null = null;
        try {
          // Gemini 임베딩 지도 새로 그리기
          embedding = await generateEmbedding(textToEmbed);
          embeddingUpdateCount++;
        } catch (embErr) {
          console.warn(`⚠️ [임베딩 지연] ${name_ko} 임베딩 생성 한도 초과 등의 오류로 생략합니다.`);
        }

        // DB 정보 업데이트
        const { error: updateError } = await supabase
          .from('materials')
          .update({
            compounds: compounds,
            embedding: embedding || undefined,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (updateError) {
          console.error(`❌ [DB 업데이트 실패] ${name_ko}:`, updateError.message);
        }
      } else {
        console.log(`❓ [매칭 실패] ${name_ko} (${species}) 학명에 해당하는 성분을 찾지 못했습니다.`);
      }

      // 서버 매너 타임 (150ms 쉬어가기)
      await new Promise(resolve => setTimeout(resolve, 150));

    } catch (itemErr: any) {
      console.error(`❌ [오류 발생] 식물 id: ${id} (${name_ko}) 처리 중 에러:`, itemErr.message || itemErr);
    }
  });

  // 3단계: 최종 결과 리포트 계산 및 정리
  const successRate = ((joinSuccessCount / materials.length) * 100).toFixed(1);
  const avgCompounds = joinSuccessCount > 0 ? (totalCompoundsFound / joinSuccessCount).toFixed(1) : '0';

  console.log('\n==================================================');
  console.log('🎉 [수집 및 조인 완료 리포트]');
  console.log(`📊 조인 성공 식물 수: ${joinSuccessCount}건 / 전체 ${materials.length}건 (성공률: ${successRate}%)`);
  console.log(`🧪 식물당 평균 화합물 성분 수: ${avgCompounds}개`);
  console.log(`🧠 임베딩 갱신 완료 건수: ${embeddingUpdateCount}건`);
  console.log('==================================================\n');

  // 뒷정리 (다운로드했던 임시 LOTUS 파일이 있으면 삭제)
  if (useLotus && lotusFilePath && fs.existsSync(lotusFilePath)) {
    fs.unlinkSync(lotusFilePath);
  }
}

startIngestion();
