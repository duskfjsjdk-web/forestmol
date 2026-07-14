import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────
// KIPRIS 특허 정보 조회 백엔드 서비스 상자
// ─────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json(
        { error: 'query 파라미터가 필요합니다. 예: ?query=소나무' },
        { status: 400 }
      );
    }

    // KIPRIS 전용 API 키가 없으면 바로 unavailable 반환
    if (!process.env.DATA_GO_KR_API_KEY) {
      return NextResponse.json({ count: null, status: 'unavailable' });
    }

    const apiKey = process.env.DATA_GO_KR_API_KEY;

    const url = `http://apis.data.go.kr/1192000/PatUtiModInfoSearchService/getWordSearch?word=${encodeURIComponent(query)}&year=0&patent=true&utility=true&numOfRows=1&pageNo=1&serviceKey=${apiKey}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/xml' },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      // HTTP 에러(500 포함) → unavailable
      return NextResponse.json({ count: null, status: 'unavailable' });
    }

    const xmlData = await res.text();

    // XML에서 totalCount 정규식 추출
    const match = xmlData.match(/<totalCount>(\d+)<\/totalCount>/i);
    if (match && match[1]) {
      return NextResponse.json({
        success: true,
        totalCount: Number(match[1]),
        source: 'api',
      });
    }

    // totalCount 없으면 → unavailable (서비스키 미승인 등)
    return NextResponse.json({ count: null, status: 'unavailable' });

  } catch (error: any) {
    console.error('❌ [Patent API] 에러:', error.message);
    return NextResponse.json({ count: null, status: 'unavailable' });
  }
}
