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
  console.log('🌿 [ForestMol] materials 테이블의 cosmetic_allowed 및 matched_ingredients 업데이트 시작\n');

  console.log('📥 화장품 원료(cosmetic_ingredients) 데이터 로드 중...');
  let allCosmeticData = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('cosmetic_ingredients')
      .select('cas_no, ingr_kor_name, ingr_eng_name')
      .range(from, from + step - 1);
    
    if (error) {
      console.error('❌ 화장품 원료 데이터 조회 실패:', error.message);
      process.exit(1);
    }
    
    if (data && data.length > 0) {
      allCosmeticData = allCosmeticData.concat(data);
      from += step;
    }
    
    if (!data || data.length < step) {
      break;
    }
  }

  // CAS No를 키로 하는 Map 생성 (빠른 검색용)
  const cosmeticMap = new Map();
  for (const item of allCosmeticData) {
    if (item.cas_no) {
      // 여러 CAS No가 기재된 경우(예: "123-45-6, 789-01-2") 처리
      const casList = item.cas_no.split(/[,;]/);
      for (let cas of casList) {
        cas = cas.trim();
        if (cas && cas !== 'N/A' && cas !== '해당없음') {
          // 첫 번째 발견된 성분명 우선 저장
          if (!cosmeticMap.has(cas)) {
            cosmeticMap.set(cas, {
              ingr_kor_name: item.ingr_kor_name,
              ingr_eng_name: item.ingr_eng_name,
              cas_no: cas,
            });
          }
        }
      }
    }
  }
  console.log(`✅ 화장품 원료 ${cosmeticMap.size}건 해시맵 구성 완료.\n`);

  console.log('📥 소재(materials) 데이터 로드 중...');
  const { data: materialsData, error: materialsError } = await supabase
    .from('materials')
    .select('id, compounds');

  if (materialsError) {
    console.error('❌ 소재 데이터 조회 실패:', materialsError.message);
    process.exit(1);
  }

  console.log(`✅ 소재 데이터 ${materialsData.length}건 조회 완료. 매칭 시작...\n`);

  let allowed = 0;
  let denied = 0;
  let notChecked = 0;

  // 업데이트할 배치 데이터 준비
  const updates = [];

  for (const m of materialsData) {
    let matchedIngredients = [];
    let hasValidCompounds = false;

    if (m.compounds) {
      let compoundsList = [];
      if (Array.isArray(m.compounds)) {
        compoundsList = m.compounds;
      } else {
        try {
          compoundsList = JSON.parse(m.compounds);
        } catch {
          compoundsList = [];
        }
      }

      if (Array.isArray(compoundsList) && compoundsList.length > 0) {
        hasValidCompounds = true;
        for (const comp of compoundsList) {
          if (comp.cas) {
            const casClean = comp.cas.trim();
            if (cosmeticMap.has(casClean)) {
              // 중복 방지
              const existing = matchedIngredients.find(x => x.cas_no === casClean);
              if (!existing) {
                matchedIngredients.push(cosmeticMap.get(casClean));
              }
            }
          }
        }
      }
    }

    let isAllowed = null;
    let matchedJson = null;

    if (hasValidCompounds) {
      if (matchedIngredients.length > 0) {
        isAllowed = true;
        matchedJson = matchedIngredients;
        allowed++;
      } else {
        isAllowed = false;
        denied++;
      }
    } else {
      notChecked++;
    }

    updates.push({
      id: m.id,
      cosmetic_allowed: isAllowed,
      cosmetic_matched_ingredients: matchedJson,
    });
  }

  console.log('🔄 매칭된 결과를 DB에 반영 중...');
  // Bulk update를 위해 개별 update를 병렬(청크) 처리합니다.
  const chunkSize = 50;
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    
    // 청크 내의 개별 업데이트를 병렬로 실행
    await Promise.all(
      chunk.map(async (updateData) => {
        const { error } = await supabase
          .from('materials')
          .update({
            cosmetic_allowed: updateData.cosmetic_allowed,
            cosmetic_matched_ingredients: updateData.cosmetic_matched_ingredients,
          })
          .eq('id', updateData.id);
        
        if (error) {
          console.error(`❌ 업데이트 실패 (ID: ${updateData.id}):`, error.message);
        }
      })
    );

    process.stdout.write(`\r✅ 진행률: ${Math.min(i + chunk.length, updates.length)} / ${updates.length}`);
  }
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 업데이트 완료 및 최종 통계');
  console.log(`전체 소재 수:  ${materialsData.length.toLocaleString()}건`);
  console.log(`허용 (true):   ${allowed.toLocaleString()}건`);
  console.log(`불가 (false):  ${denied.toLocaleString()}건`);
  console.log(`미확인(null):  ${notChecked.toLocaleString()}건`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch(err => {
  console.error('❌ 스크립트 실행 중 치명적 오류 발생:', err);
  process.exit(1);
});
