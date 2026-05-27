import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

    // 2. 768차원 쿼리 임베딩 생성
    const response = await model.embedContent(queryText);
    const queryEmbedding = response.embedding.values;

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
      const displayBioactivity = (item.bioactivity && item.bioactivity.length > 0)
        ? item.bioactivity.join(', ')
        : (item.effect ? item.effect.replace(/\r\n/g, ' ').replace(/\n/g, ' ').trim() : '정보 없음');

      return {
        ...item,
        display_species: displaySpecies,
        display_bioactivity: displayBioactivity,
        display_compounds: compoundList
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
