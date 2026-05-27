/**
 * 식물정유은행 → KNApSAck 성분 조인 스크립트
 * 
 * 문제: 식물정유은행 레코드는 species=null, scientific_name에만 학명이 있어서
 *       기존 ingest-knapsack.ts(species 기준)에서 빠짐
 * 
 * 해결: scientific_name 앞 2단어(속명+종소명)를 정규화하여 KNApSAck 재조인
 */

import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

loadEnvConfig(process.cwd());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY   = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI    = new GoogleGenerativeAI(GEMINI_API_KEY);

// ─────────────────────────────────────────────
// 학명 정규화: "Chamaecyparis obtusa (Siebold & Zucc.) Endl."
//           → "Chamaecyparis obtusa"
// HTML 엔티티(&amp; &apos;) 도 처리
// ─────────────────────────────────────────────
function normalizeScientificName(raw: string): { cleaned: string; genus: string } {
  // HTML 엔티티 디코딩
  const decoded = raw
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

  // 괄호 이전 텍스트만 사용 (명명자 제거)
  const beforeParen = decoded.split('(')[0].trim();
  const parts = beforeParen.split(/\s+/).filter(Boolean);

  const genus   = parts[0] || '';
  const cleaned = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : genus;

  return { cleaned, genus };
}

// ─────────────────────────────────────────────
// KNApSAck HTML 파서
// ─────────────────────────────────────────────
function parseKnapsackHtml(html: string): Array<{ name: string; cas: string; formula: string }> {
  const compounds: Array<{ name: string; cas: string; formula: string }> = [];
  const rows = html.split(/<\/tr>/i);

  for (const row of rows) {
    const trStart = row.search(/<tr>/i);
    if (trStart === -1) continue;
    const trContent = row.substring(trStart + 4);
    const tds = trContent.split(/<\/td>/i);
    const tdContents: string[] = [];

    for (const td of tds) {
      const match = td.match(/<td[^>]*>/i);
      if (match && match.index !== undefined) {
        tdContents.push(td.substring(match.index + match[0].length).trim());
      }
    }

    if (tdContents.length >= 4 && tdContents[0].includes('information.php')) {
      const rawCas = tdContents[1].replace(/&nbsp;/gi, '').trim();
      const cas    = (rawCas === '-' || !rawCas) ? '' : rawCas;
      const name   = tdContents[2].replace(/<[^>]*>/g, '').trim();
      const formula= tdContents[3].replace(/<[^>]*>/g, '').trim();
      if (name) compounds.push({ name, cas, formula });
    }
  }
  return compounds;
}

// ─────────────────────────────────────────────
// KNApSAck API 호출 (재시도 포함)
// ─────────────────────────────────────────────
async function fetchFromKnapsack(word: string): Promise<Array<{ name: string; cas: string; formula: string }>> {
  const url = `https://www.knapsackfamily.com/knapsack_core/result.php?sname=organism&word=${encodeURIComponent(word)}`;

  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return parseKnapsackHtml(await res.text());
    } catch (err: any) {
      if (attempt === 2) {
        console.warn(`  ❌ KNApSAck 조회 실패: "${word}" → ${err.message}`);
        return [];
      }
      await new Promise(r => setTimeout(r, 1200));
    }
  }
  return [];
}

// ─────────────────────────────────────────────
// Gemini 임베딩 생성
// ─────────────────────────────────────────────
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const res   = await model.embedContent(text);
    return res.embedding.values;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// 메인 실행
// ─────────────────────────────────────────────
async function main() {
  console.log('🌿 [ForestMol] 식물정유은행 KNApSAck 재조인 시작\n');

  // 1. 식물정유은행에서 성분이 없는 레코드 전체 가져오기
  const { data: rows, error } = await supabase
    .from('materials')
    .select('id, scientific_name, effect, name_ko')
    .eq('data_source', '식물정유은행')
    .is('compounds', null);

  if (error || !rows) {
    console.error('❌ Supabase 조회 실패:', error?.message);
    process.exit(1);
  }

  console.log(`📋 조인 대상: ${rows.length}개 레코드\n`);

  // 2. scientific_name 기준으로 중복 제거 → 학명별로 한 번만 KNApSAck 호출
  //    (같은 학명의 여러 행이 있으므로 캐시 활용)
  const cache = new Map<string, Array<{ name: string; cas: string; formula: string }>>();

  let successCount  = 0;
  let failCount     = 0;
  let processedRows = 0;

  for (const row of rows) {
    processedRows++;

    if (!row.scientific_name) {
      console.log(`  ⚠️  [${processedRows}/${rows.length}] ID ${row.id} — scientific_name 없음, 건너뜀`);
      failCount++;
      continue;
    }

    const { cleaned, genus } = normalizeScientificName(row.scientific_name);

    // ── 캐시 확인
    let compounds = cache.get(cleaned);

    if (compounds === undefined) {
      // 아직 캐시에 없으면 KNApSAck 조회
      process.stdout.write(`  🔍 [${processedRows}/${rows.length}] "${cleaned}" 조회 중... `);

      compounds = await fetchFromKnapsack(cleaned);

      // 결과 없으면 속명(genus)으로 폴백
      if (compounds.length === 0 && genus && genus !== cleaned) {
        process.stdout.write(`(속명 "${genus}" 재시도) `);
        compounds = await fetchFromKnapsack(genus);
      }

      cache.set(cleaned, compounds);

      if (compounds.length > 0) {
        console.log(`✅ ${compounds.length}개 성분 발견`);
      } else {
        console.log(`— 매칭 없음`);
      }

      // KNApSAck 서버 부하 방지 (200ms 대기)
      await new Promise(r => setTimeout(r, 200));
    }

    if (compounds.length === 0) {
      failCount++;
      continue;
    }

    // ── 임베딩 생성 (effect + 성분 요약)
    const compoundsStr  = compounds.slice(0, 30).map(c => c.name).join(', ');
    const textToEmbed   = [
      row.scientific_name ? `학명: ${row.scientific_name}` : '',
      row.name_ko         ? `식물명: ${row.name_ko}` : '',
      row.effect          ? `효능: ${row.effect}` : '',
      compoundsStr        ? `성분: ${compoundsStr}` : '',
    ].filter(Boolean).join('\n');

    const embedding = await generateEmbedding(textToEmbed);

    // ── DB 업데이트
    const updatePayload: Record<string, any> = {
      compounds,
      updated_at: new Date().toISOString(),
    };
    if (embedding) updatePayload.embedding = embedding;

    const { error: updateErr } = await supabase
      .from('materials')
      .update(updatePayload)
      .eq('id', row.id);

    if (updateErr) {
      console.error(`  ❌ DB 업데이트 실패 (ID: ${row.id}): ${updateErr.message}`);
      failCount++;
    } else {
      successCount++;
    }
  }

  console.log('\n══════════════════════════════════════════');
  console.log('🎉 재조인 완료 리포트');
  console.log(`   성공: ${successCount}건 / 전체: ${rows.length}건`);
  console.log(`   실패/미매칭: ${failCount}건`);
  console.log(`   고유 학명 캐시: ${cache.size}개`);
  console.log('══════════════════════════════════════════\n');
}

main();
