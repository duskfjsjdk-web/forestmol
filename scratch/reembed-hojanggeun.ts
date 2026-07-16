// 호장근 임베딩 재생성 스크립트
// SDK(@google/generative-ai) 방식으로 text-embedding-004 사용

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SUPABASE_URL = 'https://kvsytrnlgzyemmxieoxr.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const MATERIAL_ID = 'e4a6bec3-d222-43ff-91b9-5a29e4f060af';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embedModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await embedModel.embedContent({
    content: { parts: [{ text }], role: 'user' },
    taskType: 'RETRIEVAL_DOCUMENT' as any,
    // DB에 저장된 기존 임베딩과 차원 통일 (768)
    outputDimensionality: 768,
  } as any);
  return response.embedding.values;
}

async function main() {
  console.log('📦 1단계: 호장근 compounds 상위 10개 조회...');

  const { data: row, error } = await supabase
    .from('materials')
    .select('id, name_ko, species, compounds')
    .eq('id', MATERIAL_ID)
    .single();

  if (error || !row) {
    console.error('조회 실패:', error);
    return;
  }

  // 상위 10개 성분명 추출
  const compoundNames: string[] = (row.compounds || [])
    .slice(0, 10)
    .map((c: any) => c.name || '')
    .filter(Boolean);

  console.log(`✅ 성분 ${compoundNames.length}개:`, compoundNames.join(', '));

  // 보강된 임베딩 텍스트 구성 (요청 스펙 반영)
  const embeddingText = [
    "호장근 Reynoutria japonica",
    "항염 항산화 항균 항바이러스",
    "Polydatin Resveratrol Emodin Physcion Dihydroquercetin Taxifolin",
    "스틸벤 폴리페놀 안트라퀴논",
    "피부 항노화 피부장벽 미백",
    "산림바이오소재 천연 추출물",
    compoundNames.join(' '),
  ].join(' ');

  console.log('\n📝 2단계: 임베딩 텍스트:');
  console.log(embeddingText);

  console.log('\n🔮 3단계: Gemini text-embedding-004 임베딩 생성 중...');
  const embedding = await generateEmbedding(embeddingText);
  console.log(`✅ 임베딩 생성 완료 (벡터 차원: ${embedding.length})`);

  console.log('\n💾 4단계: Supabase UPDATE (embedding + bioactivity)...');
  const { error: updateError } = await supabase
    .from('materials')
    .update({
      embedding: embedding,
      bioactivity: ['항염', '항산화', '항균', '항종양', '항바이러스', '해독', '청열이습', '간염치료', '피부보호'],
    })
    .eq('id', MATERIAL_ID);

  if (updateError) {
    console.error('❌ UPDATE 실패:', updateError);
    return;
  }
  console.log('✅ UPDATE 완료!');

  // 검색 테스트
  console.log('\n🔍 5단계: "항염 항산화 산림 소재" 검색 테스트...');
  const queryEmbedding = await generateEmbedding('항염 항산화 산림 소재');

  const { data: results, error: searchError } = await supabase.rpc('match_materials', {
    query_embedding: queryEmbedding,
    match_count: 10,
    match_threshold: 0.0,
  });

  if (searchError) {
    console.error('검색 오류:', searchError);
    return;
  }

  console.log('\n검색 결과 TOP 10:');
  results?.forEach((r: any, i: number) => {
    const marker = r.name_ko === '호장근' ? ' ← 호장근 ✅' : '';
    console.log(`  ${i + 1}위. ${r.name_ko} (유사도: ${(r.similarity * 100).toFixed(1)}%)${marker}`);
  });

  const rank = (results?.findIndex((r: any) => r.name_ko === '호장근') ?? -1) + 1;
  if (rank > 0 && rank <= 5) {
    console.log(`\n🎉 호장근 ${rank}위 — 목표 달성!`);
  } else if (rank > 5) {
    console.log(`\n⚠️ 호장근 ${rank}위 — 추가 보강 필요`);
  } else {
    console.log('\n⚠️ 호장근이 TOP 10 밖입니다. 추가 보강 필요');
  }
}

main().catch(console.error);
