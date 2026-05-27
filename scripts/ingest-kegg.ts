import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';

// .env.local 환경 변수 파일 로드 (환경 정보 읽기 상자)
loadEnvConfig(process.cwd());

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('⚠️ [오류] Supabase URL 또는 ANON_KEY 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

// Supabase 데이터베이스와 연결할 클라이언트 리더 생성
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// API 요청 사이에 쉴 수 있는 쉼표(지연 시간) 유틸리티 함수
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// KEGG의 방대한 이름을 기억해둘 저장창고(메모리 캐시 맵)
const pathwayMap = new Map<string, string>();
const enzymeMap = new Map<string, string>();

/**
 * KEGG 도서관에서 전체 경로(Pathway)와 전체 효소(Enzyme) 카탈로그를
 * 미리 딱 한 번만 다운로드받아 메모리 사전에 올려두는 함수입니다.
 * 이렇게 하면 매번 효소 이름이나 경로 이름을 구하기 위해 API를 호출할 필요가 없어 훨씬 빠릅니다.
 */
async function buildKeggCaches() {
  console.log('📖 [KEGG 사전 구축] 전체 대사 경로(Pathway) 목록 로딩 중...');
  try {
    const res = await fetch('https://rest.kegg.jp/list/pathway');
    if (res.ok) {
      const text = await res.text();
      text.split('\n').forEach(line => {
        if (!line.trim()) return;
        const [id, name] = line.split('\t');
        if (id && name) {
          // map00941 -> Flavonoid biosynthesis 형태로 저장
          pathwayMap.set(id.trim(), name.trim());
        }
      });
      console.log(`✅ 대사 경로 사전 로드 완료! (총 ${pathwayMap.size}개 등록됨)`);
    } else {
      console.warn('⚠️ 대사 경로 사전 로드에 실패했습니다. (이름이 Unknown으로 표시될 수 있음)');
    }
  } catch (err) {
    console.error('❌ 대사 경로 로딩 중 오류 발생:', err);
  }

  // API 요청 제한을 지키기 위한 300ms 휴식
  await delay(300);

  console.log('📖 [KEGG 사전 구축] 전체 효소(Enzyme) 목록 로딩 중...');
  try {
    const res = await fetch('https://rest.kegg.jp/list/enzyme');
    if (res.ok) {
      const text = await res.text();
      text.split('\n').forEach(line => {
        if (!line.trim()) return;
        const [id, nameStr] = line.split('\t');
        if (id && nameStr) {
          // 이름 목록 중 첫 번째 명칭을 대표 이름으로 선택 (세미콜론 기준 절단)
          const name = nameStr.split(';')[0].trim();
          enzymeMap.set(id.trim(), name);
        }
      });
      console.log(`✅ 효소 사전 로드 완료! (총 ${enzymeMap.size}개 등록됨)`);
    } else {
      console.warn('⚠️ 효소 사전 로드에 실패했습니다. (이름이 Unknown으로 표시될 수 있음)');
    }
  } catch (err) {
    console.error('❌ 효소 로딩 중 오류 발생:', err);
  }

  await delay(300);
}

/**
 * 소재의 성분(compounds) 정보 중 검색어로 활용할 첫 번째 성분의 이름을 정제해 가져옵니다.
 */
function getQueryName(compounds: any): string | null {
  if (!compounds) return null;
  let list: any[] = [];

  // compounds 데이터가 배열인지, JSON 문자열인지 판별하여 정규화
  if (Array.isArray(compounds)) {
    list = compounds;
  } else if (typeof compounds === 'string') {
    try {
      const parsed = JSON.parse(compounds);
      list = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      list = compounds.split(',').map((s: string) => ({ name: s.trim() }));
    }
  }

  if (list.length === 0) return null;
  const first = list[0];
  if (!first) return null;

  if (typeof first === 'string') return first.trim();
  if (typeof first === 'object') {
    // 영문 성분명을 1순위로 조회하고, 없으면 한글명을 사용합니다.
    const name = first.name || first.compound_name || first.name_ko || '';
    return name.trim();
  }
  return null;
}

/**
 * KEGG 화합물 검색 API를 호출해 성분명으로 KEGG 고유 ID를 조회합니다.
 */
async function findCompoundId(query: string): Promise<string | null> {
  try {
    const res = await fetch(`https://rest.kegg.jp/find/compound/${encodeURIComponent(query)}`);
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.split('\n').filter(Boolean);
    if (lines.length === 0) return null;
    
    // 첫 번째 검색 매칭 결과의 ID 획득 (예: "cpd:C00389\tQuercetin;...")
    const firstLine = lines[0];
    const [cpdId] = firstLine.split('\t');
    if (cpdId && cpdId.startsWith('cpd:')) {
      return cpdId.replace('cpd:', '').trim();
    }
  } catch (error) {
    console.error(`❌ KEGG 화합물 검색 중 네트워크 에러 (검색어: ${query}):`, error);
  }
  return null;
}

/**
 * KEGG ID와 연계된 대사 경로(Pathway)를 조회한 뒤 캐시를 이용해 이름을 붙여 반환합니다.
 */
async function getCompoundPathways(keggId: string): Promise<{ id: string; name: string }[]> {
  const pathways: { id: string; name: string }[] = [];
  try {
    const res = await fetch(`https://rest.kegg.jp/link/pathway/compound:${keggId}`);
    if (!res.ok) return pathways;
    const text = await res.text();
    const lines = text.split('\n').filter(Boolean);
    
    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        // parts[1] 형식 예: "path:map00941"
        const rawPathId = parts[1].trim();
        const pathId = rawPathId.replace('path:', '');
        const name = pathwayMap.get(pathId) || 'Unknown Pathway';
        pathways.push({ id: pathId, name });
      }
    }
  } catch (error) {
    console.error(`❌ KEGG 대사 경로 조회 중 에러 (ID: ${keggId}):`, error);
  }
  return pathways;
}

/**
 * KEGG ID와 연계된 효소(Enzyme) 목록을 조회한 뒤 캐시를 이용해 이름을 붙여 반환합니다.
 */
async function getCompoundEnzymes(keggId: string): Promise<{ id: string; name: string }[]> {
  const enzymes: { id: string; name: string }[] = [];
  try {
    const res = await fetch(`https://rest.kegg.jp/link/enzyme/compound:${keggId}`);
    if (!res.ok) return enzymes;
    const text = await res.text();
    const lines = text.split('\n').filter(Boolean);
    
    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        // parts[1] 형식 예: "ec:1.13.11.24"
        const rawEcId = parts[1].trim();
        const ecId = rawEcId.replace('ec:', '');
        const name = enzymeMap.get(ecId) || 'Unknown Enzyme';
        enzymes.push({ id: ecId, name });
      }
    }
  } catch (error) {
    console.error(`❌ KEGG 효소 조회 중 에러 (ID: ${keggId}):`, error);
  }
  return enzymes;
}

/**
 * 메인 실행 엔진 함수
 */
async function startIngestion() {
  console.log('🌱 [ForestMol] KEGG API 데이터 매칭 수집을 시작합니다.');
  
  // 1단계: 사전 카탈로그 캐시 만들기
  await buildKeggCaches();

  // 2단계: DB에서 성분이 있는 식물 소재 목록 로딩
  console.log('📂 데이터베이스에서 소재 목록을 불러오고 있습니다...');
  const { data: materials, error } = await supabase
    .from('materials')
    .select('id, name_ko, species, compounds')
    .not('compounds', 'is', null);

  if (error) {
    console.error('❌ 소재 목록 로드 실패:', error.message);
    process.exit(1);
  }

  // 성분 목록의 내용물이 실제로 들어있는 소재만 선별
  const validMaterials = (materials || []).filter(m => {
    try {
      let list: any[] = [];
      if (Array.isArray(m.compounds)) {
        list = m.compounds;
      } else if (typeof m.compounds === 'string') {
        const parsed = JSON.parse(m.compounds);
        list = Array.isArray(parsed) ? parsed : [parsed];
      }
      return list.length > 0;
    } catch {
      return false;
    }
  });

  console.log(`📦 분석할 소재 후보군: 총 ${validMaterials.length}건 발견.`);

  let matchedCount = 0;

  // 3단계: 순차적으로 KEGG 도서관 검색 및 매칭
  for (let i = 0; i < validMaterials.length; i++) {
    const mat = validMaterials[i];
    const queryName = getQueryName(mat.compounds);

    if (!queryName) {
      console.log(`[${i + 1}/${validMaterials.length}] ⚠️ ${mat.name_ko} 소재: 성분명이 존재하지 않아 건너뜁니다.`);
      continue;
    }

    console.log(`\n[${i + 1}/${validMaterials.length}] 🔍 "${mat.name_ko}" 분석 중... (매칭 시도 성분: ${queryName})`);

    try {
      // 3-1. 화합물 ID 검색
      const keggId = await findCompoundId(queryName);
      await delay(300); // 300ms 쉬어가기

      if (!keggId) {
        console.log(`  ❌ KEGG에 등록되지 않은 성분명입니다.`);
        continue;
      }

      console.log(`  ✅ KEGG ID 매칭 완료: ${keggId}`);

      // 3-2. 효소 조회
      const enzymes = await getCompoundEnzymes(keggId);
      await delay(300); // 300ms 쉬어가기

      // 3-3. 대사 경로 조회
      const pathways = await getCompoundPathways(keggId);
      await delay(300); // 300ms 쉬어가기

      // 3-4. 획득한 상세 매칭 정보를 데이터베이스에 실시간 기록
      const { error: updateError } = await supabase
        .from('materials')
        .update({
          kegg_id: keggId,
          kegg_enzymes: enzymes,
          kegg_pathways: pathways
        })
        .eq('id', mat.id);

      if (updateError) {
        console.error(`  ❌ DB 업데이트 실패: ${updateError.message}`);
      } else {
        matchedCount++;
        console.log(`  🎉 DB 업데이트 성공! (효소 ${enzymes.length}개 / 대사 경로 ${pathways.length}개 연동 완료)`);
      }

    } catch (itemError) {
      console.error(`  ❌ "${mat.name_ko}" 처리 중 에러 발생 (건너뜀):`, itemError);
    }
  }

  // 4단계: 최종 통계 리포트 생성 및 출력
  console.log('\n==================================================');
  console.log('📊 KEGG API 데이터 수집 리포트');
  console.log('==================================================');

  const { data: allMats, error: reportError } = await supabase
    .from('materials')
    .select('kegg_id, kegg_enzymes, kegg_pathways');

  if (reportError) {
    console.error('❌ 최종 통계 리포트 조회 실패:', reportError.message);
  } else {
    const total = allMats.length;
    const matched = allMats.filter(m => m.kegg_id).length;
    const hasEnzymes = allMats.filter(m => Array.isArray(m.kegg_enzymes) && m.kegg_enzymes.length > 0).length;
    const hasPathways = allMats.filter(m => Array.isArray(m.kegg_pathways) && m.kegg_pathways.length > 0).length;

    console.log(`- 전체 등록 소재 수   : ${total}건`);
    console.log(`- KEGG ID 매칭 성공    : ${matched}건`);
    console.log(`- 효소(Enzymes) 보유   : ${hasEnzymes}건`);
    console.log(`- 대사경로(Pathways) 보유: ${hasPathways}건`);
    console.log('==================================================');
    console.log(`🎉 금일 스크립트 실행을 통해 총 ${matchedCount}건의 소재 정보가 보완되었습니다.`);
  }
}

startIngestion();
