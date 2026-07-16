import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { name, compounds, kegg_pathways, kegg_enzymes } = await request.json();

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      console.warn('ANTHROPIC_API_KEY is missing');
    }

    const systemPrompt = `당신은 화장품 소재 연구 보조 AI입니다.
주어진 실제 DB 데이터만 기반으로 설명합니다.
데이터 없는 수치(함량, IC₅₀, 점수 등)는 절대 생성하지 않습니다.
전문 용어는 쉽게 풀어서, 한국어로, 추측이 아닌 가능성으로 표현해줘.`;

    const userPrompt = `소재명: ${name || '알 수 없음'}
주요 성분: ${Array.isArray(compounds) ? compounds.slice(0,3).map((c:any)=>c.name).join(', ') : '정보 없음'}
KEGG 대사경로: ${Array.isArray(kegg_pathways) ? kegg_pathways.slice(0,2).map((p:any)=>p.name).join(', ') : '정보 없음'}
관련 효소: ${Array.isArray(kegg_enzymes) ? kegg_enzymes.slice(0,2).map((e:any)=>`${e.name}(EC ${e.id})`).join(', ') : '정보 없음'}

위 데이터를 바탕으로 화장품 ODM 연구원을 위해 이 소재의 효소 처리 시 예상되는 성분 변화와 화장품 소재로서의 활용 가능성을 2문장으로 설명해줘.
예시: "광나무의 Oleuropein 성분은 oleuropein beta-glucosidase(EC 3.2.1.206) 효소 처리 시 항산화 활성이 강화된 하이드록시타이로솔로 전환될 가능성이 있습니다."
전문 용어는 쉽게 풀어서, 한국어로, 가능성으로 표현해줘.
주어진 정보 중 일부(대사경로 등)가 없더라도, 제공된 성분과 효소 이름만으로 화학적 성분 전환과 화장품 소재(항산화, 미백, 보습 등)로서의 가치를 최대한 논리적으로 유추해서 작성해줘.
응답은 반드시 해석 문장만 출력해줘.`;

    console.log('=== KEGG Claude 프롬프트 ===');
    console.log(userPrompt);

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY || '' });
    let interpretation = '';
    
    // 2초 후 1회 재시도 (총 2번 시도)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const msg = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }]
        });
        
        if (msg.content[0].type === 'text') {
          interpretation = msg.content[0].text.trim();
        }
        break; // 성공 시 루프 탈출
      } catch (error: any) {
        console.error(`KEGG AI Attempt ${attempt} failed:`, error.message);
        if (attempt === 1) {
          console.log('Retrying in 2 seconds...');
          await new Promise(r => setTimeout(r, 2000));
        } else {
          interpretation = "효소 처리 분석을 불러오는 중입니다. 잠시 후 다시 시도해주세요.";
        }
      }
    }

    return NextResponse.json({ interpretation });
  } catch (e: any) {
    console.error('KEGG AI API Error:', e.message);
    return NextResponse.json({ interpretation: "효소 처리 분석을 불러오는 중입니다. 잠시 후 다시 시도해주세요." });
  }
}

