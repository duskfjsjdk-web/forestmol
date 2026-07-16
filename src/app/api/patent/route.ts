import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

export const dynamic = 'force-dynamic';

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

    const apiKey = process.env.KIPRIS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ count: null, status: 'unavailable', patents: [], debug: 'No API Key' });
    }

    const url = `http://plus.kipris.or.kr/openapi/rest/patUtiModInfoSearchSevice/freeSearchInfo?word=${encodeURIComponent(query)}&numOfRows=5&pageNo=1&accessKey=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
      method: 'GET',
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ count: null, status: 'unavailable', patents: [], debug: 'Fetch failed', resStatus: res.status });
    }

    const xmlData = await res.text();
    
    // Check if the response is actually an HTML error page (e.g. 404 from proxy/firewall)
    if (xmlData.trim().startsWith('<html') || xmlData.trim().startsWith('<!DOCTYPE html')) {
      return NextResponse.json({ count: null, status: 'unavailable', patents: [], debug: 'HTML response' });
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      parseTagValue: false // Do not parse numbers automatically to keep dates as strings
    });
    
    const jsonObj = parser.parse(xmlData);

    const itemsObj = jsonObj?.response?.body?.items;
    let totalCount = 0;
    
    if (itemsObj && itemsObj.TotalSearchCount) {
      totalCount = parseInt(itemsObj.TotalSearchCount, 10);
    }

    let patentsList: any[] = [];
    if (itemsObj && itemsObj.PatentUtilityInfo) {
      // It can be an array or a single object
      const info = Array.isArray(itemsObj.PatentUtilityInfo) ? itemsObj.PatentUtilityInfo : [itemsObj.PatentUtilityInfo];
      patentsList = info.slice(0, 3).map((p: any) => ({
        title: p.InventionName || '',
        applicant: p.Applicant || '',
        date: p.ApplicationDate || '',
        status: p.RegistrationStatus || ''
      }));
    }

    return NextResponse.json({
      success: true,
      count: totalCount,
      patents: patentsList,
      status: 'success'
    });

  } catch (error: any) {
    console.error('❌ [Patent API] 에러:', error.message);
    return NextResponse.json({ count: null, status: 'unavailable', patents: [] });
  }
}
