import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

loadEnvConfig(process.cwd());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ 필수 환경 변수가 누락되었습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function restoreHojanggunEmbedding() {
  console.log('🤖 [ForestMol] 호장근 임베딩 복원 작업을 시작합니다.');

  // 1. 호장근 데이터 조회 (.single() 대신 .select()로 안전하게 가져오기)
  const { data: records, error } = await supabase
    .from('materials')
    .select('*')
    .eq('name_ko', '호장근');

  if (error || !records || records.length === 0) {
    console.error('❌ 호장근 레코드를 찾을 수 없습니다:', error?.message);
    return;
  }

  console.log(`🍀 찾은 호장근 레코드 개수: ${records.length}`);

  for (const record of records) {
    console.log(`👉 호장근 ID: ${record.id}`);

    // 2. 성분 파싱 및 상위 10개 추출
    let compoundList: any[] = [];
    if (record.compounds) {
      if (typeof record.compounds === 'string') {
        try {
          compoundList = JSON.parse(record.compounds);
        } catch {
          compoundList = record.compounds.split(',').map((name: string) => ({ name: name.trim() }));
        }
      } else if (Array.isArray(record.compounds)) {
        compoundList = record.compounds;
      }
    }
    const top10Compounds = compoundList.slice(0, 10).map((c: any) => c.name || '').filter(Boolean).join(' ');

    // 3. bioactivity 파싱
    let bioactivityStr = '';
    if (record.bioactivity) {
      if (Array.isArray(record.bioactivity)) {
        bioactivityStr = record.bioactivity.join(' ');
      } else {
        bioactivityStr = String(record.bioactivity);
      }
    }

    // 4. 원래 DB 데이터 기반으로만 검색 텍스트 구성
    const parts = [
      record.name_ko || '',
      record.species || '',
      record.scientific_name || '',
      bioactivityStr,
      top10Compounds,
      record.usage_method || '',
      record.data_source || ''
    ];
    
    const textToEmbed = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    console.log(`📝 구성된 임베딩용 텍스트: "${textToEmbed}"`);

    // 5. gemini-embedding-001 로 재생성 ( match_materials 가 gemini-embedding-001 768차원을 사용하고 있음 )
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
      const response = await model.embedContent({
        content: { role: 'user', parts: [{ text: textToEmbed }] },
        outputDimensionality: 768,
      } as any);
      const embedding = response.embedding.values;

      console.log(`✅ 임베딩 생성 완료 (차원수: ${embedding.length})`);

      // 6. Supabase DB 업데이트
      const { error: updateError } = await supabase
        .from('materials')
        .update({
          embedding: embedding,
          updated_at: new Date().toISOString()
        })
        .eq('id', record.id);

      if (updateError) {
        console.error('❌ DB 업데이트 실패:', updateError.message);
      } else {
        console.log(`🎉 호장근 ID ${record.id} 임베딩 원복 완료!`);
      }
    } catch (err: any) {
      console.error('❌ 임베딩 생성/DB 업데이트 실패:', err.message || err);
    }
  }
}

restoreHojanggunEmbedding();
