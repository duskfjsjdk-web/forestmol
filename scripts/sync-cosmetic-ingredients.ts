import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

// ── 환경변수 로드 ───────────────────────────────────
const DATA_GO_KR_API_KEY = process.env.DATA_GO_KR_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!DATA_GO_KR_API_KEY) {
  console.error('❌ DATA_GO_KR_API_KEY가 존재하지 않습니다.');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Supabase 환경변수가 존재하지 않습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const API_URL = 'https://apis.data.go.kr/1471000/CsmtcsIngdCpntInfoService01/getCsmtcsIngdCpntInfoService01';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ── API 호출 (재시도 로직 포함) ─────────────────────
async function fetchPage(pageNo: number, retries = 3): Promise<any> {
  const key = encodeURIComponent(DATA_GO_KR_API_KEY!);
  const url = `${API_URL}?serviceKey=${key}&type=json&numOfRows=100&pageNo=${pageNo}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) {
        throw new Error(`HTTP 에러! 상태코드: ${res.status}`);
      }
      const json = await res.json();
      if (json?.header?.resultCode !== '00') {
        throw new Error(`API 응답 오류: ${json?.header?.resultMsg || '알 수 없는 오류'}`);
      }
      return json.body;
    } catch (err: any) {
      console.warn(`  [${pageNo}페이지] 호출 실패 (시도 ${attempt}/${retries}): ${err.message}`);
      if (attempt === retries) throw err;
      await delay(1000 * attempt); // 실패 시 점진적으로 대기 시간을 늘려 재시도
    }
  }
}

// ── 메인 실행 함수 ─────────────────────────────────
async function main() {
  console.log('🌿 [ForestMol] 식약처 화장품 원료 전체 데이터 수집 시작\n');

  // ① 기존 데이터 비우기 (중복 방지)
  console.log('🧹기존 cosmetic_ingredients 데이터를 비우는 중...');
  const { error: deleteError } = await supabase
    .from('cosmetic_ingredients')
    .delete()
    .neq('id', -1); // 모든 행 삭제 조건

  if (deleteError) {
    console.error('❌ 기존 데이터 삭제 실패:', deleteError.message);
    process.exit(1);
  }
  console.log('✅ 기존 데이터 청소 완료.\n');

  // ② 1페이지를 먼저 호출하여 전체 수량 파악
  console.log('📡 첫 페이지 호출 중...');
  const firstPageBody = await fetchPage(1);
  const totalCount = firstPageBody?.totalCount ?? 0;
  const items = firstPageBody?.items ?? [];

  if (totalCount === 0) {
    console.error('❌ 수집할 데이터가 없습니다.');
    process.exit(1);
  }

  const numOfRows = 100;
  const totalPages = Math.ceil(totalCount / numOfRows);
  console.log(`📦 총 등록 원료 수: ${totalCount.toLocaleString()}건 (총 ${totalPages} 페이지)`);

  let totalSaved = 0;

  // ③ 페이지 순회하며 수집 및 저장
  for (let page = 1; page <= totalPages; page++) {
    process.stdout.write(`⏳ [${page}/${totalPages} 페이지] 수집 중... `);

    let body;
    if (page === 1) {
      body = firstPageBody;
    } else {
      try {
        body = await fetchPage(page);
      } catch (err: any) {
        console.error(`\n❌ [${page}페이지] 수집 실패로 중단:`, err.message);
        break;
      }
    }

    const pageItems = body?.items || [];
    if (pageItems.length === 0) {
      console.log('데이터 없음 (건너뜀)');
      continue;
    }

    // Supabase 테이블 구조에 맞게 데이터 변환
    const records = pageItems.map((item: any) => ({
      ingr_kor_name: item.INGR_KOR_NAME || null,
      ingr_eng_name: item.INGR_ENG_NAME || null,
      cas_no: item.CAS_NO || null,
      origin_info: item.ORIGIN_MAJOR_KOR_NAME || null,
      synonym: item.INGR_SYNONYM || null
    }));

    // DB에 일괄 저장 (Bulk Insert)
    const { error: insertError } = await supabase
      .from('cosmetic_ingredients')
      .insert(records);

    if (insertError) {
      console.log(`\n❌ DB 저장 실패: ${insertError.message}`);
    } else {
      totalSaved += records.length;
      console.log(`✅ 저장 완료 (+${records.length}건, 누적: ${totalSaved}건)`);
    }

    // API 부하 방지 및 안정성을 위해 딜레이 부여
    await delay(200);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 식약처 화장품 원료 데이터 수집 완료!');
  console.log(`총 저장된 데이터: ${totalSaved.toLocaleString()}건`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch(err => {
  console.error('❌ 스크립트 실행 중 치명적 오류 발생:', err);
  process.exit(1);
});
