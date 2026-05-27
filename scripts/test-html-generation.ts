import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateReportHtml } from '../src/lib/report-template';

// .env.local 파일 로드
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseKey || !geminiApiKey) {
  console.error('환경변수 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 또는 GEMINI_API_KEY가 누락되었습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface AiInterpretationResult {
  bioactivity_summary: string;
  cosmetic_insight: string;
  timeline: Array<{ period: string; action: string; desc: string }>;
}

async function generateAiInterpretation(
  nameKo: string,
  bioactivityList: string[],
  compoundsList: string[]
): Promise<AiInterpretationResult> {
  const prompt = `
다음 산림 소재 데이터를 바탕으로 화장품 ODM 연구원을 위한 리포트용 AI 분석 데이터를 생성해줘.

[소재 데이터]
- 국문명: ${nameKo}
- 주요 효능(생리활성): ${bioactivityList.slice(0, 3).join(', ') || '정보 없음'}
- 주요 성분: ${compoundsList.slice(0, 3).join(', ') || '정보 없음'}

[요구사항]
다음 3가지 항목을 구체적인 조건에 맞게 작성하고, 최종 결과는 지정된 JSON 형식으로만 응답해줘.

1. "bioactivity_summary" (§2 생물활성 데이터 AI 해석):
   소재명 ${nameKo}, 효능 ${bioactivityList.slice(0, 3).join(', ')}를 바탕으로 화장품 ODM 연구원을 위한 활용 가능성을 전문적이고 간결하게 한국어 3문장으로 설명해줘.
2. "cosmetic_insight" (§4 화장품 원료 적합성 AI 해석):
   화장품 원료 적합성 측면에서 ${nameKo}의 활용 시 주의사항을 한국어 2문장으로 작성해줘.
3. "timeline" (§6 다음 단계 타임라인):
   소재 ${nameKo} 기반 화장품 개발 시 즉시/1-3개월/3-6개월/6개월 이후 단계별 권장 액션을 각 2문장씩 작성해줘.

[출력 형식 JSON]
반드시 아래 JSON 형식으로만 응답해줘. 다른 텍스트(설명, 마크다운 코드 블록 등)는 절대 포함하지 마. 오직 순수한 JSON 중괄호 시작부터 끝까지만 출력해.
{
  "bioactivity_summary": "[§2 AI 해석 내용 - 3문장]",
  "cosmetic_insight": "[§4 AI 해석 내용 - 2문장]",
  "timeline": [
    { "period": "즉시", "action": "[즉시 권장 행동 요약]", "desc": "[상세 권장 액션 설명 2문장]" },
    { "period": "1-3개월", "action": "[1-3개월 권장 행동 요약]", "desc": "[상세 권장 액션 설명 2문장]" },
    { "period": "3-6개월", "action": "[3-6개월 권장 행동 요약]", "desc": "[상세 권장 액션 설명 2문장]" },
    { "period": "6개월 이후", "action": "[6개월 이후 권장 행동 요약]", "desc": "[상세 권장 액션 설명 2문장]" }
  ]
}
`;

  const defaultInterpretation: AiInterpretationResult = {
    bioactivity_summary: `${nameKo}은(는) 산림 공공데이터 기반으로 기획된 우수한 화장품 후보 소재입니다. 함유된 천연 유기 성분과 생리 활성 지표를 바탕으로 연구원들의 포뮬레이션 설계 검토가 추천됩니다.`,
    cosmetic_insight: `해당 소재의 주요 성분은 피부 장벽 개선 및 진정 카테고리에 우수한 배합 가능성을 나타낼 수 있습니다. 가용화 설계 시 원료 배합 비율 연구가 권장됩니다.`,
    timeline: [
      {
        period: '즉시',
        action: '분양 신청 및 샘플 수급',
        desc: '산림바이오소재은행 등을 통해 시료 분양 신청을 진행하고 유통 원료사 견적을 동시에 의뢰하여 개발 타임라인 단축을 도모합니다.'
      },
      {
        period: '1-3개월',
        action: '원료 안전성 및 제형성 적합 검토',
        desc: '기초 피부 자극 테스트를 실시하고 타깃 에센스/세럼 제형 처방에 따른 가속 안정성 시험(40℃/6주)을 설계하여 확인합니다.'
      },
      {
        period: '3-6개월',
        action: '인체 적용 효능 평가 설계',
        desc: '소재 효능 검증을 위한 주름/탄력도 개선 평가를 계획하고 전문 화장품 임상 평가 기관을 선정하여 인체 적용 시험에 착수합니다.'
      },
      {
        period: '6개월 이후',
        action: '개별인정형 신청 및 제품 출시 준비',
        desc: '선행 허가 사례의 임상 데이터 패키지를 참고하여 화장품 법적 서류 보완을 완료하고 최종 양산화 제조를 위한 사양 조율을 마칩니다.'
      }
    ]
  };

  try {
    console.log(`🤖 [AI Test] Gemini 모델(gemini-1.5-pro) 기동 시도 중... (${nameKo})`);
    const genAI = new GoogleGenerativeAI(geminiApiKey!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanJson = responseText.trim().replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return {
      bioactivity_summary: parsed.bioactivity_summary || defaultInterpretation.bioactivity_summary,
      cosmetic_insight: parsed.cosmetic_insight || defaultInterpretation.cosmetic_insight,
      timeline: Array.isArray(parsed.timeline) ? parsed.timeline : defaultInterpretation.timeline
    };
  } catch (err: any) {
    console.warn('⚠️ Gemini API 1.5 Pro 실패. 기본 분석 코멘트(Fallback)로 대체 진행합니다. 에러:', err.message);
    return defaultInterpretation;
  }
}

async function run() {
  const selectedMaterialIds = ['bd90792d-bac7-4fd0-9322-04d06b428484']; // 소나무 (kegg 데이터 존재)

  console.log('1. DB materials 테이블에서 섬잣나무 조회 중...');
  const { data: materials, error: materialsError } = await supabase
    .from('materials')
    .select('*')
    .in('id', selectedMaterialIds);

  if (materialsError || !materials || materials.length === 0) {
    console.error('소재 조회 실패:', materialsError);
    return;
  }
  
  const m = materials[0];
  console.log(`DB 조회 성공. name: "${m.name}", cosmetic_allowed: "${m.cosmetic_allowed}"`);
  console.log('kegg 데이터:', m.kegg_pathways, m.kegg_enzymes);

  // 효능 및 성분 파싱
  const bioList = m.bioactivity || [];
  let compoundList: any[] = [];
  if (m.compounds) {
    if (Array.isArray(m.compounds)) {
      compoundList = m.compounds;
    } else {
      try {
        compoundList = JSON.parse(m.compounds);
      } catch {}
    }
  }
  const compoundsNames = compoundList.map(c => c.name || '');

  // 2. AI 해석 실행
  console.log('2. AI 해석 서비스 호출 중...');
  const aiComments = await generateAiInterpretation(
    m.name || '섬잣나무',
    bioList,
    compoundsNames
  );

  console.log('\n--- AI 코멘트 확인 ---');
  console.log('Bioactivity Summary:', aiComments.bioactivity_summary);
  console.log('Cosmetic Insight:', aiComments.cosmetic_insight);
  console.log('Timeline Count:', aiComments.timeline?.length);
  console.log('----------------------\n');

  // 3. HTML 리포트 조립
  console.log('3. 신규 5대 섹션 HTML 리포트 템플릿 빌드 중...');
  const mappedMaterial = {
    id: m.id,
    name_ko: m.name_ko || m.name || '알 수 없는 소재',
    name_en: m.name_en || '',
    species: m.species || m.scientific_name || '',
    data_source: m.data_source || '',
    source_org: m.source_org || '',
    region: m.region || '',
    bioactivity: bioList,
    compounds: compoundList,
    patent_count: m.patent_count || 0,
    patents: m.patents || [],
    raw_data: m.raw_data || {},
    cosmetic_allowed: m.cosmetic_allowed,
    aiComments: aiComments,
    kegg_id: m.kegg_id || null,
    kegg_pathways: m.kegg_pathways || [],
    kegg_enzymes: m.kegg_enzymes || []
  };

  const htmlContent = generateReportHtml(
    {
      name: '항균클린징폼 프리미엄 제안서',
      clientName: '코스메카코리아',
      description: '섬잣나무 추출물 배합을 통한 항균 및 항염 기능성 라인 구축'
    },
    [mappedMaterial],
    'client',
    'rnd-assistant@forestmol.ai',
    '여드름 및 항균 소재 탐색'
  );

  console.log('HTML 리포트 빌드 성공! 총 크기:', htmlContent.length);

  // 4. HTML 파일 내용을 임시 파일로 보존하여 execute_sql에 활용하기 쉽게 출력
  const fs = require('fs');
  const tempPath = path.join(process.cwd(), 'scripts', 'temp-premium-report.html');
  fs.writeFileSync(tempPath, htmlContent, 'utf-8');
  console.log(`임시 HTML 파일 보존 완료: ${tempPath}`);

  // 5. DB reports 테이블의 test-token-1234-abcd 행의 html_content 컬럼을 업데이트
  console.log('5. DB reports 테이블에 테스트 리포트 업데이트 중...');
  const { data: updateData, error: updateError } = await supabase
    .from('reports')
    .update({ html_content: htmlContent })
    .eq('share_token', 'test-token-1234-abcd')
    .select();

  if (updateError) {
    console.error('리포트 업데이트 실패:', updateError);
    return;
  }
  console.log('✅ DB 업데이트 성공! 웹 뷰어에서 새 리포트를 확인해 보세요.');
}

run();
