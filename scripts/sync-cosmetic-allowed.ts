import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

// ── 환경변수 로드 ───────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Supabase 환경변수가 존재하지 않습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── 메인 실행 함수 ─────────────────────────────────
async function main() {
  console.log('🌿 [ForestMol] materials 테이블의 cosmetic_allowed 업데이트 시작\n');

  console.log('🔄 데이터베이스 연산(RPC) 실행 중...');
  // Supabase에 생성해둔 update_cosmetic_allowed 함수(RPC) 호출
  const { error: rpcError } = await supabase.rpc('update_cosmetic_allowed');

  if (rpcError) {
    console.error('❌ 업데이트 연산 실행 실패:', rpcError.message);
    process.exit(1);
  }
  console.log('✅ 데이터베이스 조인 및 업데이트 연산 완료.\n');

  // 최종 결과 집계 및 검증
  console.log('📊 최종 결과 확인 중...');
  const { data: materials, error: selectError } = await supabase
    .from('materials')
    .select('cosmetic_allowed');

  if (selectError) {
    console.error('❌ 최종 결과 조회 실패:', selectError.message);
    process.exit(1);
  }

  let total = materials.length;
  let allowed = 0;
  let denied = 0;
  let notChecked = 0;

  for (const m of materials) {
    if (m.cosmetic_allowed === true) {
      allowed++;
    } else if (m.cosmetic_allowed === false) {
      denied++;
    } else {
      notChecked++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 업데이트 완료 및 최종 통계');
  console.log(`전체 소재 수:  ${total.toLocaleString()}건`);
  console.log(`허용 (true):   ${allowed.toLocaleString()}건`);
  console.log(`불가 (false):  ${denied.toLocaleString()}건`);
  console.log(`미확인(null):  ${notChecked.toLocaleString()}건`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch(err => {
  console.error('❌ 스크립트 실행 중 치명적 오류 발생:', err);
  process.exit(1);
});
