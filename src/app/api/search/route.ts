import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseBioactivityTags } from '@/utils/parseBioactivity';

export const dynamic = 'force-dynamic';

const embeddingCache = new Map<string, number[]>();

async function getEmbeddingWithRetry(model: any, text: string, retries = 3): Promise<number[]> {
  if (embeddingCache.has(text)) {
    return embeddingCache.get(text)!;
  }
  
  try {
    const response = await model.embedContent({
      content: { role: 'user', parts: [{ text }] },
      outputDimensionality: 768,
    } as any);
    const embedding = response.embedding.values;
    embeddingCache.set(text, embedding);
    return embedding;
  } catch (error: any) {
    if (error.status === 429 && retries > 0) {
      console.warn(`[API SEARCH] 429 Rate Limit Hit. Retrying in 3 seconds... (${retries} retries left)`);
      await new Promise(r => setTimeout(r, 3000));
      return getEmbeddingWithRetry(model, text, retries - 1);
    }
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryText = searchParams.get('query');

    if (!queryText) {
      return NextResponse.json(
        { error: 'query 파라미터가 필요합니다. 예: ?query=홍삼' },
        { status: 400 }
      );
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: '서버 환경 설정(GEMINI_API_KEY)이 부족합니다.' },
        { status: 500 }
      );
    }

    // 1. Google Gemini 임베딩 인스턴스 준비
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // 데이터베이스 데이터와 유사도 매칭을 위해 768차원의 gemini-embedding-001 모델을 사용합니다.
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

    // 2. 768차원 쿼리 임베딩 생성 (캐싱 및 재시도 로직 적용)
    const queryEmbedding = await getEmbeddingWithRetry(model, queryText);

    console.log(`[API SEARCH] URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}, queryText: "${queryText}", Embedding length: ${queryEmbedding.length}, first val: ${queryEmbedding[0]}`);

    // 3. Supabase pgvector 검색 함수(match_materials) 실행
    const { data: materials, error: searchError } = await supabase.rpc(
      'match_materials',
      {
        query_embedding: queryEmbedding,
        match_threshold: -1,
        match_count: 12,
      }
    );

    if (searchError) {
      console.error('❌ Supabase 검색 오류:', searchError.message);
      return NextResponse.json(
        { error: `유사도 검색 오류: ${searchError.message}` },
        { status: 500 }
      );
    }

    // 4. 프론트엔드 편의를 위한 데이터 통합 가공 (Fallback 처리)
    const processedMaterials = materials?.map((item: any) => {
      let compoundList: string[] = [];
      if (item.compounds && Array.isArray(item.compounds)) {
        compoundList = item.compounds.slice(0, 3).map((c: any) => c.name || c.name_ko || c.compound_name || '이름 없음');
      }

      const displaySpecies = item.species || item.scientific_name || '정보 없음';
      const isEssentialOil = item.data_source === '식물정유은행';
      let rawBio = '';
      if (item.bioactivity && Array.isArray(item.bioactivity) && item.bioactivity.length > 0) {
        rawBio = item.bioactivity[0];
      } else {
        const combined = [];
        if (item.effect) combined.push(item.effect);
        if (item.usage_method) combined.push(item.usage_method);
        if (combined.length > 0) {
          rawBio = combined.join(' ■ ')
            .split('■')
            .map((s: string) => s.trim().split(/[\s(,]/)[0].trim())
            .filter((t: string) => t.length > 0)
            .join(',');
        }
      }

      const COSMETIC_KEYWORDS = [
        '항균', '항산화', '항염', '항노화', '항암',
        '미백', '보습', '주름', '피부', '진정',
        '탄력', '두피', '모발', '발모', '살균',
        '항진균', '항바이러스', '소염', '면역',
        '윤택', '윤기', '항알레르기',
        '양모', '육모', '피부윤택', '피부미용',
        '보윤', '수렴', '각질', '재생',
        '진통', '소종', '해독', '청열',
        '혈액순환', '혈행', '강장', '자양',
        '강정', '피로', '활력', '원기',
        '윤장', '윤폐', '건조', '방부',
        '방향', '탈취', '광노화'
      ];

      const displayBioactivity = rawBio
        .split(',')
        .map(t => t.trim().replace(/\s*등$/, '').trim())
        .filter(t => 
          t.length > 1 && 
          !t.includes(':') && 
          !t.includes('(') &&
          COSMETIC_KEYWORDS.some(kw => t.includes(kw) || t.startsWith(kw))
        )
        .join(', ');

      if (isEssentialOil) {
        console.log('정유은행 소재:', {
          name: item.name,
          usage_method: item.usage_method,
          display_bioactivity: displayBioactivity,
        });
      }

      return {
        ...item,
        display_species: displaySpecies,
        display_bioactivity: displayBioactivity,
        display_compounds: compoundList,
        cosmetic_matched_ingredients: item.cosmetic_matched_ingredients
      };
    });

    return NextResponse.json({ results: processedMaterials });
  } catch (error: any) {
    console.error('❌ API 실행 중 오류:', error);
    return NextResponse.json(
      { error: error.message || '서버 내부 오류' },
      { status: 500 }
    );
  }
}
