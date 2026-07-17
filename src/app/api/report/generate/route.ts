import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabaseServer';
import { generateReportHtml } from '@/lib/report-template';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

import { XMLParser } from 'fast-xml-parser';

// 특허 정보 조회 - API 실패 시 null 반환
async function fetchPatentData(query: string): Promise<{ count: number; patents: any[] } | null> {
  const apiKey = process.env.KIPRIS_API_KEY;
  if (!apiKey) {
    console.error('❌ [Report Patent] KIPRIS_API_KEY is missing');
    return null;
  }
  try {
    const url = `http://plus.kipris.or.kr/openapi/rest/patUtiModInfoSearchSevice/freeSearchInfo?word=${encodeURIComponent(query)}&numOfRows=20&pageNo=1&accessKey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!res.ok) {
      console.error(`❌ [Report Patent] KIPRIS API fetch failed: ${res.status}`);
      return null;
    }
    const xmlData = await res.text();
    if (xmlData.trim().startsWith('<html') || xmlData.trim().startsWith('<!DOCTYPE html')) {
      console.error('❌ [Report Patent] KIPRIS API returned HTML instead of XML');
      return null;
    }
    const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });
    const jsonObj = parser.parse(xmlData);
    const itemsObj = jsonObj?.response?.body?.items;
    
    if (jsonObj?.response?.header?.resultCode !== '00') {
      console.error('❌ [Report Patent] KIPRIS API error code:', jsonObj?.response?.header?.resultCode, jsonObj?.response?.header?.resultMsg);
    }

    let totalCount = 0;
    if (itemsObj && itemsObj.TotalSearchCount) {
      totalCount = parseInt(itemsObj.TotalSearchCount, 10);
    }
    let patentsList: any[] = [];
    if (itemsObj && itemsObj.PatentUtilityInfo) {
      const info = Array.isArray(itemsObj.PatentUtilityInfo) ? itemsObj.PatentUtilityInfo : [itemsObj.PatentUtilityInfo];
      patentsList = info.slice(0, 20).map((p: any) => ({
        title: p.InventionName || '',
        applicant: p.Applicant || '',
        date: p.ApplicationDate || '',
        status: p.RegistrationStatus || ''
      }));
    }
    console.log(`✅ [Report Patent] Fetched ${totalCount} patents for ${query}`);
    return { count: totalCount, patents: patentsList };
  } catch (err: any) {
    console.error('❌ [Report Patent] Exception during KIPRIS API fetch:', err.message);
    return null;
  }
}

async function fetchPubChemCid(query: string): Promise<number | null> {
  console.log(`🧪 [PubChem CID] 조회 시도 (CAS 또는 성분명): "${query}"`);
  if (!query) return null;
  try {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(query.trim())}/cids/JSON`;
    console.log(`🧪 [PubChem CID] 요청 URL: ${url}`);
    const res = await fetch(url, { 
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log(`🧪 [PubChem CID] 응답 상태 코드: ${res.status}`);
    if (!res.ok) {
      console.log(`🧪 [PubChem CID] 실패 응답 텍스트:`, await res.text());
      return null;
    }
    const data = await res.json();
    if (data.IdentifierList && data.IdentifierList.CID && data.IdentifierList.CID.length > 0) {
      const cid = data.IdentifierList.CID[0];
      console.log(`🧪 [PubChem CID] 성공 CID 획득: ${cid}`);
      return cid;
    }
    console.log(`🧪 [PubChem CID] CID 목록 데이터 없음`);
    return null;
  } catch (err: any) {
    console.error(`🧪 [PubChem CID] 통신 에러:`, err.message);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const { projectId, materialIds, selectedMaterialIds, template } = await request.json();
    const finalMaterialIds = materialIds || selectedMaterialIds;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    if (!finalMaterialIds || !Array.isArray(finalMaterialIds) || finalMaterialIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '리포트에 포함할 소재를 최소 1개 이상 선택해 주세요.' },
        { status: 400 }
      );
    }

    // 1. 유저 인증 상태 확인
    const cookieStore = cookies();
    const token = cookieStore.get('forestmol-token')?.value;
    const supabase = getSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '인증 세션이 유효하지 않습니다. 다시 로그인해 주세요.' },
        { status: 401 }
      );
    }

    // 2. 프로젝트 상세 데이터 조회 (유저 권한으로 RLS 확인)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { success: false, error: '프로젝트를 찾을 수 없거나 접근 권한이 없습니다.' },
        { status: 404 }
      );
    }

    // 3. Supabase materials 테이블에서 실제 데이터 조회
    const { data: materials, error: materialsError } = await supabase
      .from('materials')
      .select('id, name_ko, name, species, scientific_name, bioactivity, compounds, cosmetic_allowed, cosmetic_matched_ingredients, raw_data, source_org, data_source, distribution, kegg_id, kegg_pathways, kegg_enzymes, usage_method')
      .in('id', finalMaterialIds);

    if (materialsError || !materials) {
      console.error('소재 데이터 조회 오류:', materialsError);
      return NextResponse.json(
        { success: false, error: '소재 데이터를 읽어오는 데 실패했습니다.' },
        { status: 500 }
      );
    }

    if (materials.length === 0) {
      return NextResponse.json(
        { success: false, error: '선택한 소재의 세부 정보를 데이터베이스에서 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 4. Gemini API를 활용한 통합 AI 리포트 본문 해석 생성 (1회 호출 진행)
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: '서버 환경 설정(GEMINI_API_KEY)이 부족합니다.' },
        { status: 500 }
      );
    }
    
    // RLS R&D 스펙 맞춤형 간략 데이터 포맷 가공 (AI 컨텍스트 최적화)
    const aiInputMaterials = materials.map((m: any) => {
      let compoundsSnippet = [];
      if (m.compounds) {
        if (Array.isArray(m.compounds)) {
          compoundsSnippet = m.compounds.slice(0, 5).map((c: any) => ({ name: c.name, cas_no: c.cas || c.cas_no }));
        } else {
          try {
            const parsed = JSON.parse(m.compounds);
            if (Array.isArray(parsed)) {
              compoundsSnippet = parsed.slice(0, 5).map((c: any) => ({ name: c.name, cas_no: c.cas || c.cas_no }));
            }
          } catch {}
        }
      }

      return {
        id: m.id,
        name_ko: m.name_ko || m.name,
        species: m.species || m.scientific_name,
        bioactivity: m.bioactivity,
        compounds: compoundsSnippet,
        cosmetic_allowed: m.cosmetic_allowed,
        kegg_pathways: m.kegg_pathways,
        kegg_enzymes: m.kegg_enzymes
      };
    });

    const formattedMaterials = aiInputMaterials.map((m: any) => {
      const logData = {
        name_ko: m.name_ko,
        compounds: m.compounds?.slice(0,3),
        kegg_pathways: m.kegg_pathways?.slice(0,2),
        kegg_enzymes: m.kegg_enzymes?.slice(0,2)
      };
      console.log(`KEGG prompt data for ${m.name_ko}:`, logData);

      return `소재명: ${m.name_ko}
주요 성분: ${Array.isArray(m.compounds) ? m.compounds.slice(0,3).map((c:any) => c.name).join(', ') : '정보 없음'}
관련 효소: ${Array.isArray(m.kegg_enzymes) ? m.kegg_enzymes.slice(0,2).map((e:any) => `${e.name}(EC ${e.id})`).join(', ') : '정보 없음'}
대사경로: ${Array.isArray(m.kegg_pathways) ? m.kegg_pathways.slice(0,2).map((p:any) => p.name).join(', ') : '정보 없음'}
생리활성: ${Array.isArray(m.bioactivity) ? m.bioactivity.join(', ') : m.bioactivity || '정보 없음'}
화장품사용여부: ${m.cosmetic_allowed ? '가능' : '불가'}`;
    }).join('\n---\n');

    const systemPrompt = `당신은 화장품 소재 연구 보조 AI입니다.
주어진 실제 DB 데이터만 기반으로 설명합니다.
데이터 없는 수치(함량, IC₅₀, 점수 등)는 절대 생성하지 않습니다.
출력은 JSON만, 마크다운 없이.`;

    const keggInterpretationsPrompt = aiInputMaterials.map((m: any) => 
      `"${m.name_ko || m.name}": "제공된 성분과 효소 이름만으로 화학적 성분 전환과 화장품 소재(항산화, 미백, 보습 등)로서의 가치를 최대한 논리적으로 유추해서 2문장으로 작성해줘. 예시: '광나무의 Oleuropein 성분은 효소 처리 시 항산화 활성이 강화된 하이드록시타이로솔로 전환될 가능성이 있습니다.' 전문 용어는 쉽게 풀어서, 한국어로 작성."`
    ).join(',\n    ');

    const userPrompt = `소재 정보:
${formattedMaterials}

아래 JSON 형식으로만 응답해:
{
  "effect_summary": "소재 효능 요약 2~3문장 (bioactivity 기반)",
  "cosmetic_interpretation": "화장품 활용 가능성 2문장 (cosmetic_allowed 기반)",
  "material_kegg_interpretations": {
    ${keggInterpretationsPrompt}
  },
  "timeline": [
    { "period": "즉시 — 2주 이내", "action": "..", "desc": ".." },
    { "period": "1~3개월", "action": "..", "desc": ".." },
    { "period": "3~6개월", "action": "..", "desc": ".." },
    { "period": "6개월 이후", "action": "..", "desc": ".." }
  ]
}`;

    let aiResult = {
      effect_summary: '소재 추출물의 효능 분석 요약입니다.',
      cosmetic_interpretation: '화장품 원료 배합 적합성 검토 결과입니다.',
      material_kegg_interpretations: {} as Record<string, string>,
      timeline: [
        { period: '즉시 — 2주 이내', action: '분양 신청 및 실물 확보', desc: '분양 코드를 활용하여 무상 분양을 신청하고 원료 공급을 가시화합니다.' },
        { period: '1~3개월', action: '안전성 평가 및 제형 개발', desc: 'OECD 가이드라인 기준 피부 안도 평가를 설계하고 가속 보관 안정성 시험을 시작합니다.' },
        { period: '3~6개월', action: '인체 적용 효능 검증 위탁', desc: '한국화장품인체적용평가원 등의 기관을 선정하여 인체 유효성 데이터 획득에 들어갑니다.' },
        { period: '6개월 이후', action: '양산화 세부 사양서 작성', desc: '성분 스펙화를 구축하고 INCI 등록 정보와 함께 완제품 양산 협의를 최종 진행합니다.' }
      ]
    };

    try {
      console.log(`🤖 [AI Interpretation] Gemini 모델 기동 중... (모델명: gemini-3.5-flash)`);

      console.log('=== KEGG Claude 프롬프트 ===');
      console.log('systemPrompt:', systemPrompt);
      console.log('userPrompt:', userPrompt);
      console.log('=== 전달 데이터 ===');
      aiInputMaterials.forEach((material: any) => {
        console.log({
          name_ko: material.name_ko,
          compounds_count: material.compounds?.length,
          compounds_sample: material.compounds?.slice(0,3)?.map((c: any) => c.name),
          kegg_enzymes_count: material.kegg_enzymes?.length,
          kegg_enzymes_sample: material.kegg_enzymes?.slice(0,2),
          kegg_pathways_count: material.kegg_pathways?.length,
        });
      });

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: userPrompt
            }]
          }],
          systemInstruction: {
            parts: [{
              text: systemPrompt
            }]
          },
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini HTTP Error: ${response.status}`);
      }

      const resData = await response.json();
      const responseText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleanJson = responseText.trim().replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      if (parsed.effect_summary && parsed.cosmetic_interpretation && Array.isArray(parsed.timeline)) {
        aiResult = parsed;
        console.log(`🤖 [AI Interpretation] Gemini 결과 생성 성공!`);
      }
    } catch (e: any) {
      console.error('⚠️ Gemini API 호출 또는 파싱 오류. 기본 Fallback을 활용합니다.', e.message);
    }

    // ─── §2-C AI 해석 보강 ───────────────────────────────────────────
    // 배치 호출 결과에 material_kegg_interpretations가 없거나 비어 있으면
    // 슬라이드오버와 동일한 방식으로 소재별 개별 Claude 호출로 생성
    console.log('🔍 [KEGG 해석 확인] material_kegg_interpretations:', JSON.stringify(aiResult.material_kegg_interpretations));

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const GEMINI_API_KEY_LOCAL = process.env.GEMINI_API_KEY || '';
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY_LOCAL);
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const keggSystemPrompt = `당신은 화장품 소재 연구 보조 AI입니다.
주어진 실제 DB 데이터만 기반으로 설명합니다.
데이터 없는 수치(함량, IC₅₀, 점수 등)는 절대 생성하지 않습니다.
전문 용어는 쉽게 풀어서, 한국어로, 추측이 아닌 가능성으로 표현해줘.`;

    for (const m of aiInputMaterials) {
      const mName = m.name_ko || m.name || '';
      if (!mName) continue;

      // 이미 유효한 해석이 있으면 스킵
      const existing = aiResult.material_kegg_interpretations?.[mName];
      if (existing && existing !== '효소 처리 실험 설계 참고용으로 활용할 수 있습니다.') {
        console.log(`✅ [KEGG 해석] ${mName}: 배치 결과 사용`);
        continue;
      }

      // KEGG 데이터가 없으면 스킵
      if (!m.kegg_enzymes?.length && !m.kegg_pathways?.length) {
        console.log(`⏭️ [KEGG 해석] ${mName}: KEGG 데이터 없음, 스킵`);
        continue;
      }

      const keggPrompt = `소재명: ${mName}
주요 성분: ${Array.isArray(m.compounds) ? m.compounds.slice(0,3).map((c:any) => c.name).join(', ') : '정보 없음'}
KEGG 대사경로: ${Array.isArray(m.kegg_pathways) ? m.kegg_pathways.slice(0,2).map((p:any) => p.name).join(', ') : '정보 없음'}
관련 효소: ${Array.isArray(m.kegg_enzymes) ? m.kegg_enzymes.slice(0,2).map((e:any) => `${e.name}(EC ${e.id})`).join(', ') : '정보 없음'}

위 데이터를 바탕으로 화장품 ODM 연구원을 위해 이 소재의 효소 처리 시 예상되는 성분 변화와 화장품 소재로서의 활용 가능성을 2문장으로 설명해줘.
예시: "광나무의 Oleuropein 성분은 oleuropein beta-glucosidase(EC 3.2.1.206) 효소 처리 시 항산화 활성이 강화된 하이드록시타이로솔로 전환될 가능성이 있습니다."
전문 용어는 쉽게 풀어서, 한국어로, 가능성으로 표현해줘.
응답은 반드시 해석 문장만 출력해줘.`;

      let interpretation = '';
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const result = await geminiModel.generateContent(keggSystemPrompt + '\n\n' + keggPrompt);
          interpretation = result.response.text().trim();
          break;
        } catch (keggErr: any) {
          console.error(`⚠️ [KEGG 해석] ${mName} Attempt ${attempt} failed:`, keggErr.message);
          if (attempt === 1) {
            console.log('Retrying in 2 seconds...');
            await new Promise(r => setTimeout(r, 2000));
          } else {
            interpretation = "효소 처리 분석을 불러오는 중입니다. 잠시 후 다시 시도해주세요.";
          }
        }
      }

      if (interpretation) {
        if (!aiResult.material_kegg_interpretations) {
          aiResult.material_kegg_interpretations = {};
        }
        aiResult.material_kegg_interpretations[mName] = interpretation;
        console.log(`✅ [KEGG 해석] ${mName} 개별 생성 완료:`, interpretation.slice(0, 60) + '...');
      }
    }
    // ─────────────────────────────────────────────────────────────────

    // 5. KIPRIS 실시간 특허 연동 및 PubChem 구조식 CID, PubMed 논문 동시 획득
    const mappedMaterials = await Promise.all(materials.map(async (m: any) => {
      const patentData = await fetchPatentData(m.name_ko || m.name || '');
      
      // 첫 번째 성분의 cas_no 및 영문 성분명 가져오기
      let firstCasNo = '';
      let firstCompoundName = '';
      console.log(`🧪 [PubChem CID] 소재 ${m.name_ko}의 compounds 데이터 타입: ${typeof m.compounds}, 내용:`, JSON.stringify(m.compounds));
      
      if (m.compounds) {
        let compoundsList = [];
        if (Array.isArray(m.compounds)) {
          compoundsList = m.compounds;
        } else {
          try {
            compoundsList = typeof m.compounds === 'string' ? JSON.parse(m.compounds) : m.compounds;
          } catch (e: any) {
            console.error(`🧪 [PubChem CID] compounds JSON 파싱 실패:`, e.message);
          }
        }
        if (Array.isArray(compoundsList) && compoundsList.length > 0) {
          firstCasNo = compoundsList[0].cas || compoundsList[0].cas_no || '';
          firstCompoundName = compoundsList[0].name || '';
          console.log(`🧪 [PubChem CID] 소재 ${m.name_ko}에서 추출된 첫 번째 CAS 번호: "${firstCasNo}", 성분명: "${firstCompoundName}"`);
        } else {
          console.log(`🧪 [PubChem CID] 소재 ${m.name_ko}의 화합물 리스트가 비어있음`);
        }
      } else {
        console.log(`🧪 [PubChem CID] 소재 ${m.name_ko}에 화합물(compounds) 데이터 자체가 존재하지 않음`);
      }

      let cid = firstCasNo ? await fetchPubChemCid(firstCasNo) : null;
      if (!cid && firstCompoundName) {
        console.log(`🧪 [PubChem CID] CAS 조회 실패/부재로 영문 성분명 "${firstCompoundName}"으로 재시도`);
        cid = await fetchPubChemCid(firstCompoundName);
      }
      console.log(`🧪 [PubChem CID] 소재 ${m.name_ko}의 최종 PubChem CID 결과:`, cid);

      // PubMed 논문 조회 추가
      let papers: any[] = [];
      const scientificName = m.scientific_name || m.species || '';
      const origin = request.url ? new URL(request.url).origin : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
      
      if (scientificName) {
        try {
          // 상위 성분 3개 추출
          let compoundsList: any[] = [];
          if (m.compounds) {
            if (Array.isArray(m.compounds)) {
              compoundsList = m.compounds;
            } else {
              try {
                compoundsList = typeof m.compounds === 'string' ? JSON.parse(m.compounds) : m.compounds;
              } catch {}
            }
          }
          const PRIORITY_COMPOUNDS = ['piceid', 'polydatin', 'resveratrol', 'emodin', 'dihydroquercetin', 'taxifolin', 'physcion'];
          const sortedCompounds = [...(compoundsList || [])].sort((a: any, b: any) => {
            const aPri = PRIORITY_COMPOUNDS.findIndex(p => (a.name || '').toLowerCase().includes(p));
            const bPri = PRIORITY_COMPOUNDS.findIndex(p => (b.name || '').toLowerCase().includes(p));
            return (aPri === -1 ? 999 : aPri) - (bPri === -1 ? 999 : bPri);
          });

          const compNames = sortedCompounds
            .slice(0, 3)
            .map((c: any) => c.name)
            .join(',');

          const pubmedRes = await fetch(`${origin}/api/pubmed?scientificName=${encodeURIComponent(scientificName)}&compounds=${encodeURIComponent(compNames)}`);
          if (pubmedRes.ok) {
            const pubmedData = await pubmedRes.json();
            if (pubmedData.success) {
              papers = pubmedData.papers || [];
            }
          }
        } catch (e: any) {
          console.error(`⚠️ [Report Generate] ${m.name_ko} PubMed 조회 실패:`, e.message);
        }
      }

      // KEGG AI 해석 생성 코드 추가
      let kegg_interpretation = '';
      try {
        const keggResponse = await fetch(
          `${origin}/api/kegg-interpretation`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name_ko: m.name_ko,
              compounds: m.compounds,
              kegg_enzymes: m.kegg_enzymes,
              kegg_pathways: m.kegg_pathways
            })
          }
        );
        if (keggResponse.ok) {
          const { interpretation } = await keggResponse.json();
          kegg_interpretation = interpretation || '';
        }
      } catch (e: any) {
        console.error(`⚠️ [Report Generate] ${m.name_ko} KEGG Interpretation failed:`, e.message);
      }

      return {
        id: m.id,
        name_ko: m.name_ko || m.name || '알 수 없는 소재',
        name_en: m.name_en || '',
        species: m.species || m.scientific_name || '',
        data_source: m.data_source || '',
        source_org: m.source_org || '',
        region: (m as any).region || '',
        distribution: (m as any).distribution || null,
        bioactivity: m.bioactivity || [],
        compounds: m.compounds || [],
        patent_count: patentData ? patentData.count : null,
        patents: patentData ? patentData.patents : [],
        raw_data: (() => { console.log('raw_data:', m.raw_data); return m.raw_data || {}; })(),
        cosmetic_allowed: m.cosmetic_allowed,
        cosmetic_matched_ingredients: m.cosmetic_matched_ingredients || null,
        kegg_id: m.kegg_id || null,
        kegg_enzymes: m.kegg_enzymes || [],
        kegg_pathways: m.kegg_pathways || [],
        pubchem_cid: cid,
        papers,
        kegg_interpretation
      };
    }));

    // 6. HTML 리포트 템플릿 생성
    const htmlContent = generateReportHtml(
      {
        name: project.name,
        clientName: project.client_name || '미지정',
        description: project.description || ''
      },
      mappedMaterials,
      template || 'client',
      user.email || 'R&D 연구원',
      project.description || '미지정',
      aiResult
    );

    // 7. DB reports 테이블에 공유 링크 내역 인서트 (30일 만료 토큰 생성)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30일 유효

    const supabaseAdmin = getSupabaseAdmin();
    const { data: reportInsert, error: insertError } = await supabaseAdmin
      .from('reports')
      .insert({
        project_id: projectId,
        user_id: user.id,
        title: `[ForestMol] ${project.name} 제안 리포트`,
        html_content: htmlContent,
        expires_at: expiresAt.toISOString(),
        material_ids: finalMaterialIds,
        share_token: crypto.randomUUID()
      })
      .select('id, share_token')
      .single();

    if (insertError || !reportInsert) {
      console.error('리포트 메타데이터 DB 저장 오류:', insertError);
      return NextResponse.json(
        { success: false, error: `공유 링크 생성 실패: ${insertError ? insertError.message : 'DB 데이터 반환 없음'}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reportId: reportInsert.id,
      shareToken: reportInsert.share_token,
      expiresAt: expiresAt.toISOString()
    });

  } catch (error: any) {
    console.error('리포트 생성 API 예외 발생:', error);
    return NextResponse.json(
      { success: false, error: `서버 예외 오류: ${error.message}` },
      { status: 500 }
    );
  }
}
