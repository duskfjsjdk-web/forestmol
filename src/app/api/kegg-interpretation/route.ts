import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function POST(req: Request) {
  try {
    const { name_ko, compounds, kegg_enzymes, kegg_pathways } = await req.json();
    
    console.log('백엔드 수신 데이터:', { name_ko, compoundsCount: compounds?.length, enzymesCount: kegg_enzymes?.length, pathwaysCount: kegg_pathways?.length });

    if (!kegg_enzymes?.length && !kegg_pathways?.length) {
      return Response.json({ interpretation: null });
    }

    const compoundNames = compounds
      ?.slice(0, 3)
      .map((c: any) => c.name)
      .join(', ') || '';

    const enzymeNames = kegg_enzymes
      ?.slice(0, 2)
      .map((e: any) => e.name || e)
      .join(', ') || '';

    const pathwayNames = kegg_pathways
      ?.slice(0, 2)
      .map((p: any) => p.name || p)
      .join(', ') || '';

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `소재명: ${name_ko}
주요 성분: ${compoundNames}
관련 효소: ${enzymeNames}
대사경로: ${pathwayNames}

위 데이터를 바탕으로 화장품 ODM 연구원을 위해
효소 처리 시 예상되는 성분 변화와
화장품 소재로서의 활용 가능성을 2문장으로 설명해줘.
전문 용어는 쉽게 풀어서, 한국어로, 가능성으로 표현.
데이터가 부족하면 "효소 처리 실험 설계 참고용으로 활용할 수 있습니다."만 출력.`
      }]
    });

    const interpretation = message.content[0].type === 'text' 
      ? message.content[0].text 
      : null;

    return Response.json({ interpretation });
  } catch (error) {
    console.error('KEGG interpretation error:', error);
    return Response.json({ interpretation: null }, { status: 500 });
  }
}
