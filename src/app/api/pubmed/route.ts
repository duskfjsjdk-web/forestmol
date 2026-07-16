import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 24시간 단위 캐싱을 위한 인메모리 캐시 맵
// 키: 검색 쿼리 문자열, 값: { timestamp: 타임스탬프, data: 논문 결과 배열 }
const cacheMap = new Map<string, { timestamp: number; data: any[] }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24시간 (밀리초)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawScientificName = searchParams.get('scientificName') || '';
    // 학명 정제: 첫 두 단어(속명, 종명)만 추출하고 저자명 등 특수문자 제거
    // 예: "Fallopia japonica (Houtt.) RonseDecr." -> "Fallopia japonica"
    const scientificName = rawScientificName
      .split(/[\s]+/)
      .slice(0, 2)
      .join(' ')
      .replace(/[^a-zA-Z\s]/g, '');
    const compoundsParam = searchParams.get('compounds') || '';

    // 성분명 파라미터 파싱 (쉼표로 구분되어 입력)
    const compounds = compoundsParam
      .split(',')
      .map(c => c.trim())
      .filter(Boolean)
      .slice(0, 3); // 상위 최대 3개 성분

    if (!scientificName) {
      return NextResponse.json(
        { error: 'scientificName 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    // 검색 쿼리 구성: 소재 학명 + 대표 성분명 상위 3개 + "cosmetic OR skin"
    const queryParts = [scientificName, ...compounds];
    const searchTerm = `(${queryParts.join(' ')}) AND (cosmetic OR skin)`;
    
    // 캐시 확인
    const cached = cacheMap.get(searchTerm);
    const now = Date.now();
    if (cached && now - cached.timestamp < CACHE_DURATION) {
      console.log(`⚡ [PubMed API] 캐시 히트: "${searchTerm}"`);
      console.log('PubMed query:', searchTerm);
      return NextResponse.json({ success: true, papers: cached.data });
    }

    console.log(`🔍 [PubMed API] 신규 요청 검색 쿼리: "${searchTerm}"`);
    console.log('PubMed query:', searchTerm);

    // 1. esearch.fcgi로 PMID 목록 조회 (최대 3건)
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(searchTerm)}&retmode=json&retmax=3`;
    const searchRes = await fetch(searchUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!searchRes.ok) {
      return NextResponse.json({ success: true, papers: [] });
    }

    let searchData = await searchRes.json();
    let idList = searchData.esearchresult?.idlist || [];

    // 검색 결과가 0건이고 성분명이 있는 경우, 학명을 제외하고 성분명만으로 재검색 (Step 2. 검색어 단순화)
    if (idList.length === 0 && compounds.length > 0) {
      const fallbackSearchTerm = `(${compounds.join(' ')}) AND (cosmetic OR skin OR anti-inflammatory)`;
      console.log(`⚠️ [PubMed API] 결과 0건. 성분명으로 재검색: "${fallbackSearchTerm}"`);
      const fallbackUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(fallbackSearchTerm)}&retmode=json&retmax=3`;
      const fallbackRes = await fetch(fallbackUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        idList = fallbackData.esearchresult?.idlist || [];
      }
    }

    if (idList.length === 0) {
      // 결과가 없어도 캐싱하여 불필요한 반복 호출 방지
      cacheMap.set(searchTerm, { timestamp: now, data: [] });
      return NextResponse.json({ success: true, papers: [] });
    }

    // 2. esummary.fcgi로 제목·저자·저널·DOI 조회
    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${idList.join(',')}&retmode=json`;
    const summaryRes = await fetch(summaryUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!summaryRes.ok) {
      return NextResponse.json({ success: true, papers: [] });
    }

    const summaryData = await summaryRes.json();
    const results = summaryData.result || {};

    const papers = idList.map((pmid: string) => {
      const doc = results[pmid];
      if (!doc) return null;

      // 저자 가공
      let authors = 'Unknown';
      if (doc.authors && Array.isArray(doc.authors) && doc.authors.length > 0) {
        const firstAuthor = doc.authors[0].name || '';
        authors = doc.authors.length > 1 ? `${firstAuthor}, et al.` : firstAuthor;
      }

      // 연도 추출 (pubdate 형식에서 년도 4자리 파싱)
      let year = 'Unknown';
      if (doc.pubdate) {
        const match = doc.pubdate.match(/\d{4}/);
        if (match) year = match[0];
      }

      // DOI 추출
      let doi = '';
      if (doc.articleids && Array.isArray(doc.articleids)) {
        const doiObj = doc.articleids.find((id: any) => id.idtype === 'doi');
        if (doiObj) {
          doi = doiObj.value || '';
        }
      }

      return {
        pmid,
        title: doc.title || 'No Title Available',
        authors,
        journal: doc.source || 'Unknown Journal',
        year,
        doi,
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      };
    }).filter(Boolean);

    // 캐싱 저장
    cacheMap.set(searchTerm, { timestamp: now, data: papers });

    return NextResponse.json({ success: true, papers });
  } catch (error: any) {
    console.error('❌ [PubMed API] 에러:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
