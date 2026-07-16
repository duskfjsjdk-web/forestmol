// ────────────────────────────────────────────────────────
// HTML 리포트 템플릿 생성 헬퍼 (Premium Forest Green Theme)
// ────────────────────────────────────────────────────────

export interface AiResult {
  effect_summary: string;
  cosmetic_interpretation: string;
  material_kegg_interpretations?: Record<string, string>;
  timeline: Array<{ period: string; action: string; desc: string }>;
}

interface MaterialData {
  id: string;
  name_ko: string;
  name_en?: string;
  species: string;
  scientific_name?: string;
  data_source: string;
  source_org: string;
  region?: string;
  distribution?: string | null;
  bioactivity?: string[] | string | null;
  compounds?: Array<{ cas?: string; name?: string; formula?: string; category?: string; source?: string }> | string | null;
  patent_count?: number;
  raw_data?: any;
  usage_method?: string | null;
  cosmetic_allowed?: boolean | null;
  cosmetic_matched_ingredients?: any[] | null;
  kegg_id?: string | null;
  kegg_pathways?: Array<{ id: string; name: string }> | null;
  kegg_enzymes?: Array<{ id: string; name: string }> | null;
  pubchem_cid?: number | null;
  papers?: Array<{
    pmid: string;
    title: string;
    authors: string;
    journal: string;
    year: string;
    doi: string;
    url: string;
  }>;
}

interface ProjectData {
  name: string;
  clientName?: string;
  description?: string;
}

// 생물활성 효능 텍스트에서 단일 키워드 추출 헬퍼
function extractBioactivityKeyword(bioStr: string): string {
  if (!bioStr) return '';
  let cleanStr = bioStr.replace(/[■\-•]/g, '').trim();
  cleanStr = cleanStr.replace(/\s*\(.*?\)/g, '').trim();
  const firstWord = cleanStr.split(/[\s,]+/)[0];
  
  const coreKeywords = ["항노화", "항산화", "항염", "미백", "보습", "항균", "진정", "피부", "주름", "면역", "항암"];
  for (const keyword of coreKeywords) {
    if (firstWord.includes(keyword)) {
      return keyword;
    }
  }
  return firstWord || bioStr;
}

export function generateReportHtml(
  project: ProjectData,
  materials: MaterialData[],
  template: 'internal' | 'client' = 'client',
  creatorEmail: string = 'R&D 연구원',
  searchQuery: string = '미지정',
  aiResult?: AiResult
): string {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\. /g, '. ').replace(/\.$/, ''); // 예: 2026. 05. 27

  const pagesHtml = materials.map((m, idx) => {
    // 1. raw_data 파싱
    let rawObj: any = {};
    if (m.raw_data) {
      if (typeof m.raw_data === 'string') {
        try {
          rawObj = JSON.parse(m.raw_data);
          if (typeof rawObj === 'string') rawObj = JSON.parse(rawObj);
        } catch {}
      } else {
        rawObj = m.raw_data;
      }
    }
    if (Array.isArray(rawObj) && rawObj.length > 0) {
      rawObj = rawObj[0];
    } else if (Array.isArray(rawObj) && rawObj.length === 0) {
      rawObj = {};
    }

    // 데이터 소스별 추출 조건 파싱
    let extractionPart: string | null = null;
    let extractionSolvent: string | null = null;
    let extractionMethod: string | null = null;
    let harvestMethod: string | null = null; // 약용식물 전용 채취 방법

    const ds = (m.data_source || '').toLowerCase();

    if (ds.includes('바이오소재')) {
      // 산림바이오소재: raw_data 필드에서 파싱
      extractionPart   = rawObj?.['추출부위'] || rawObj?.['부위'] || rawObj?.['채취부위'] || null;
      extractionSolvent = rawObj?.['추출용매'] || rawObj?.['용매'] || null;
      extractionMethod  = rawObj?.['추출방법'] || rawObj?.['추출 방법'] || null;
    } else if (ds.includes('약용식물')) {
      // 산림청_약용식물: bioactivity[1]을 채취 방법으로 표시
      const bioArr = Array.isArray(m.bioactivity) ? m.bioactivity as string[]
        : (m.bioactivity ? [String(m.bioactivity)] : []);
      if (bioArr.length >= 2 && bioArr[1]) {
        harvestMethod = String(bioArr[1]).trim();
      }
    }
    // 식물정유은행: 추출 조건 데이터 없음 → 모두 null 유지

    const distributionCode = rawObj?.['식별번호'] || rawObj?.['분양코드'] || rawObj?.['분양번호'] || rawObj?.['accession_no'] || rawObj?.['distribution_code'] || null;

    // 자생지 우선순위 파싱: distribution 컨럼 → raw_data 약용식물분포설명 → null
    const distributionText: string | null =
      (m.distribution && m.distribution.trim()) ||
      rawObj['약용식물분포설명'] ||
      rawObj['분포'] ||
      rawObj['distribution'] ||
      m.region ||
      null;

    // 데이터 소스별 효능 파싱 (Section 1 용도)
    let sec1Tags: string[] = [];
    const COSMETIC_KEYWORDS = [
      // 기존
      '항균', '항산화', '항염', '항노화', '항암',
      '미백', '보습', '주름', '피부', '진정',
      '탄력', '두피', '모발', '발모', '살균',
      '항진균', '항바이러스', '소염', '면역',
      '윤택', '윤기', '항알레르기',

      // 추가 — 피부·모발 관련
      '양모', '육모', '피부윤택', '피부미용',
      '보윤', '수렴', '각질', '재생',

      // 추가 — 항염·진통 관련
      '진통', '소종', '해독', '청열',
      '냉증', '혈액순환', '혈행',

      // 추가 — 강장·활력 관련
      '강장', '자양', '강정', '피로',
      '활력', '원기',

      // 추가 — 보습·수분 관련
      '윤장', '윤폐', '건조',

      // 추가 — 향장품 관련
      '방부', '방향', '탈취', '자외선',
      '광노화', '콜라겐', '엘라스틴'
    ];

    const BLACKLIST_KEYWORDS = [
      '중풍', '골절', '폐결핵', '치매', '정력', '척추', '심장염', '가슴막염', '칠독',
      '거풍', '조습', '강직성', '야맹증', '양모발약', '위경련', '연골', '이명',
      '임신중독', '조해', '종독', '종창', '토혈', '풍비', '허약체질', '화상',
      '간질', '두현', '신허', '양음', '오로보호', '윤장', '윤폐'
    ];

    const SOLVENT_KEYWORDS = [
      'Ethyl Acetate', 'EA', 'EtOH', 'MeOH', 'Hexane', 'BuOH', 'Water', 
      'Residue', 'Fraction', '분획', '추출', '용매'
    ];

    if (ds.includes('약용식물') || ds.includes('바이오소재')) {
      const bioArr = Array.isArray(m.bioactivity) ? m.bioactivity as string[] : (m.bioactivity ? [String(m.bioactivity)] : []);
      if (bioArr.length > 0 && bioArr[0]) {
        sec1Tags = bioArr[0]
          .split(',')
          .map(s => s.trim().replace(/\s*등$/, ''))
          .filter(t => t.length > 1 && t.length < 25 && !t.includes('http') && !t.match(/\d{4}/))
          .filter(t => {
            const hasSolvent = SOLVENT_KEYWORDS.some(kw => t.toLowerCase().includes(kw.toLowerCase()));
            const hasBlacklist = BLACKLIST_KEYWORDS.some(kw => t.includes(kw));
            const isCosmetic = COSMETIC_KEYWORDS.some(kw => t.includes(kw) || t.startsWith(kw));
            return !hasSolvent && !hasBlacklist && isCosmetic;
          });
      }
    } else if (ds.includes('정유은행')) {
      if (m.usage_method) {
        const keywords = m.usage_method
          .split('■')
          .map(s => s.trim())
          .map(s => s.split(/[\s(,]/)[0].trim())
          .filter(t => t.length > 1 && COSMETIC_KEYWORDS.some(kw => t.startsWith(kw)));
        sec1Tags = Array.from(new Set(keywords));
      }
    }

    // 커버 헤더 태그 구성 (효능 태그 앞 3개 + 지역 + 출처기관)
    const headerTags = [...sec1Tags.slice(0, 3)];
    if (m.region) headerTags.push(m.region.split(/[\s,]+/)[0]);
    headerTags.push(m.source_org ? m.source_org.split(' ')[0] : '공공데이터');

    // §2 효능 태그 HTML
    let bioTagsHtml = '';
    const hasBioactivity = sec1Tags.length > 0;
    if (hasBioactivity) {
      const displayTags = sec1Tags.slice(0, 8);
      const extraCount = sec1Tags.length - 8;
      
      let tagsHtml = displayTags.map(keyword => `<span class="tag" style="background:#E1F5EE; color:#085041; border:0.5px solid #9FE1CB; padding: 4px 10px; border-radius: 6px; font-weight: 500; font-size: 12px;">${keyword}</span>`).join('');
      if (extraCount > 0) {
        tagsHtml += `<span class="tag" style="background:#F5F5F4; color:#78716C; border:0.5px solid #E7E5E4; padding: 4px 10px; border-radius: 6px; font-weight: 500; font-size: 12px;">+${extraCount}개</span>`;
      }
      
      bioTagsHtml = `
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0 16px 0;">
          ${tagsHtml}
        </div>
      `;
    }

    // 3. 주요 성분 (compounds) 파싱 및 테이블 렌더링
    let compoundList: Array<{ cas?: string; name?: string; formula?: string; category?: string; source?: string }> = [];
    if (m.compounds) {
      if (Array.isArray(m.compounds)) {
        compoundList = m.compounds;
      } else {
        try {
          const parsed = JSON.parse(m.compounds);
          compoundList = Array.isArray(parsed) ? parsed : [];
        } catch {
          compoundList = String(m.compounds).split(',').map(name => ({ name: name.trim() }));
        }
      }
    }

    // CAS No 또는 성분명 기준 중복 제거
    const uniqueCompounds = compoundList.reduce((acc, compound) => {
      const key = (compound.cas || compound.name || '').trim();
      if (key && !acc.some(c => (c.cas || c.name || '').trim() === key)) {
        acc.push(compound);
      }
      return acc;
    }, [] as typeof compoundList);

    // 대표 성분 우선순위 정렬 적용 (최종 조정 순서)
    const PRIORITY_COMPOUNDS = [
      'piceid',
      'polydatin',
      'resveratrol',
      'emodin',
      'dihydroquercetin',
      'taxifolin',
      'physcion'
    ];

    uniqueCompounds.sort((a, b) => {
      const getPriority = (name: string) => {
        const clean = name.toLowerCase().replace(/^\(e\)-/, '').trim();
        const idx = PRIORITY_COMPOUNDS.findIndex(p => clean === p.toLowerCase());
        return idx === -1 ? 999 : idx;
      };

      const aPri = getPriority(a.name || '');
      const bPri = getPriority(b.name || '');

      if (aPri !== bPri) {
        return aPri - bPri;
      }
      return 0;
    });

    let compoundsSectionHtml = '';
    if (uniqueCompounds && uniqueCompounds.length > 0) {
      const displayCompounds = uniqueCompounds.slice(0, 10);
      const remainingCompounds = uniqueCompounds.slice(10);
      const extraCount = remainingCompounds.length;
      
      const mainRows = displayCompounds.map(c => `
        <tr>
          <td style="font-weight: 500; color: var(--color-text-primary);">${c.name || '성분명 없음'}</td>
          <td style="color:var(--color-text-tertiary); font-family:var(--font-mono); font-size:11px;">${c.cas || '-'}</td>
          <td style="color:var(--color-text-secondary);">KNApSAck DB</td>
        </tr>
      `).join('');

      let remainingRows = '';
      if (extraCount > 0) {
        remainingRows = remainingCompounds.map(c => `
          <tr>
            <td style="font-weight: 500; color: var(--color-text-primary);">${c.name || '성분명 없음'}</td>
            <td style="color:var(--color-text-tertiary); font-family:var(--font-mono); font-size:11px;">${c.cas || '-'}</td>
            <td style="color:var(--color-text-secondary);">KNApSAck DB</td>
          </tr>
        `).join('');
      }

      // 고유 ID 생성 (소재 ID의 특수문자 제거)
      const uniqueId = m.id.replace(/[^a-zA-Z0-9]/g, '');

      compoundsSectionHtml = `
        <!-- §2-B 주요 성분 목록 -->
        <div class="sec">
          <div class="sec-head">
            <div class="sec-num n2" style="font-size: 10px; font-weight: bold; background: #E6F1FB; color: #185FA5;">2-B</div>
            <div class="sec-title">주요 성분 목록</div>
            <span class="sec-badge tag-blue">성분 DB 연동</span>
          </div>
          <table class="tbl">
            <thead>
              <tr>
                <th style="width: 50%;">성분명 (Compound)</th>
                <th style="width: 25%;">CAS No</th>
                <th style="width: 25%;">출처</th>
              </tr>
            </thead>
            <tbody>
              ${mainRows}
            </tbody>
            ${extraCount > 0 ? `
            <tbody id="all-compounds-${uniqueId}" style="display:none">
              ${remainingRows}
            </tbody>
            ` : ''}
          </table>
          ${extraCount > 0 ? `
          <div style="margin-top:12px; text-align:center;">
            <button onclick="
              var t = document.getElementById('all-compounds-${uniqueId}');
              var b = document.getElementById('toggle-btn-${uniqueId}');
              if(t.style.display === 'none'){
                t.style.display = 'table-row-group';
                b.textContent = '접기 ▲';
              } else {
                t.style.display = 'none';
                b.textContent = '외 ${extraCount}개 성분 모두 보기 ▼';
              }
            " id="toggle-btn-${uniqueId}"
            style="background:#E6F1FB; color:#185FA5; border:1.5px solid #B5D4F4; padding:6px 14px; border-radius:6px; font-size:11px; font-weight:bold; cursor:pointer; transition:all 0.2s;">
              외 ${extraCount}개 성분 모두 보기 ▼
            </button>
          </div>
          ` : ''}
        </div>
      `;
    }

    // 3.5. KEGG 대사 경로 및 효소 섹션 HTML 생성 (있을 때만 노출)
    let keggSectionHtml = '';
    const hasPathways = Array.isArray(m.kegg_pathways) && m.kegg_pathways.length > 0;
    const hasEnzymes = Array.isArray(m.kegg_enzymes) && m.kegg_enzymes.length > 0;

    if (hasPathways || hasEnzymes) {
      let pathwaysText = '정보 없음';
      if (hasPathways && m.kegg_pathways) {
        pathwaysText = m.kegg_pathways.length > 1
          ? `${m.kegg_pathways[0].name} 외 ${m.kegg_pathways.length - 1}개`
          : m.kegg_pathways[0].name;
      }

      let enzymesText = '정보 없음';
      if (hasEnzymes && m.kegg_enzymes) {
        enzymesText = m.kegg_enzymes.length > 1
          ? `${m.kegg_enzymes[0].name} (EC ${m.kegg_enzymes[0].id}) 외 ${m.kegg_enzymes.length - 1}개`
          : `${m.kegg_enzymes[0].name} (EC ${m.kegg_enzymes[0].id})`;
      }

      const mName = m.name_ko || m.name || '';
      const interpretationText = aiResult?.material_kegg_interpretations?.[mName] 
        || "효소 처리 실험 설계 참고용으로 활용할 수 있습니다.";

      keggSectionHtml = `
        <!-- §2-C 효소 처리 가능성 (KEGG) -->
        <div class="sec">
          <div class="sec-head">
            <div class="sec-num n2" style="font-size: 10px; font-weight: bold; background: #EEEDFE; color: #3C3489;">2-C</div>
            <div class="sec-title">효소 처리 가능성 (KEGG)</div>
            <span class="sec-badge tag-purple">생물학 활성 데이터</span>
          </div>
          
          <div style="font-size: 11.5px; color: var(--color-text-primary); font-weight: 500; margin-bottom: 14px; line-height: 1.6; padding: 12px; background-color: #F8F9FA; border-radius: 6px; border: 1px solid #E9ECEF;">
            <span style="color: #6366F1; font-weight: 800; font-size: 10px; margin-bottom: 4px; display: inline-block;">✨ AI Analysis</span><br/>
            ${interpretationText}
          </div>

          <div class="kv">
            <span class="kv-label">관련 효소</span>
            <span class="kv-val" style="font-weight: 500; color: var(--color-text-primary);">${enzymesText}</span>
            <span class="kv-label">대사 경로</span>
            <span class="kv-val" style="font-weight: 500; color: var(--color-text-primary);">${pathwaysText}</span>
          </div>
          
          <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #E5E7EB; font-size: 10.5px; color: #854D0E; line-height: 1.5;">
            ⚠ 본 해석은 KEGG DB 기반 AI 생성 참고 정보이며 실험적 검증이 필요합니다.<br/>
            <span style="color:var(--color-text-tertiary); font-size:10px;">출처: KEGG Database (genome.jp)</span>
          </div>
        </div>
      `;
    }


    let cosmeticCardHtml = '';
    if (m.cosmetic_allowed === true) {
      let matchedRows = '';
      if (m.cosmetic_matched_ingredients && Array.isArray(m.cosmetic_matched_ingredients) && m.cosmetic_matched_ingredients.length > 0) {
        const displayIngredients = m.cosmetic_matched_ingredients.slice(0, 5);
        matchedRows = displayIngredients.map(ing => `
          <tr>
            <td style="font-weight: 500; color: var(--color-text-primary);">${ing.ingr_kor_name || '-'}</td>
            <td style="color:var(--color-text-tertiary); font-size:11px;">${ing.ingr_eng_name || '-'}</td>
            <td style="color:var(--color-text-tertiary); font-family:var(--font-mono); font-size:11px;">${ing.cas_no || '-'}</td>
          </tr>
        `).join('');
      }

      cosmeticCardHtml = `
        <div class="reg-card reg-ok" style="margin-top: 8px;">
          <div class="reg-title" style="font-size: 13px; font-weight: bold; display: flex; align-items: center; gap: 6px;">
            <span>✓ 식약처 원료성분 등록 확인</span>
          </div>
          <div class="reg-body" style="margin-top: 6px; font-size: 12px; line-height: 1.6;">식약처 화장품 원료성분 목록에 등록된 원료입니다.</div>
          ${matchedRows ? `
          <table class="tbl" style="margin-top: 10px; background: white; border-color: #9FE1CB;">
            <thead>
              <tr>
                <th style="width: 35%; background: #E1F5EE; border-color: #9FE1CB; color: #085041;">성분명(한글)</th>
                <th style="width: 40%; background: #E1F5EE; border-color: #9FE1CB; color: #085041;">성분명(영문)</th>
                <th style="width: 25%; background: #E1F5EE; border-color: #9FE1CB; color: #085041;">CAS No</th>
              </tr>
            </thead>
            <tbody>
              ${matchedRows}
            </tbody>
          </table>
          <div style="font-size: 10px; color: var(--color-text-tertiary); margin-top: 6px;">출처: 식약처 화장품 원료성분 정보 (data.go.kr)</div>
          ` : ''}
        </div>
      `;
    } else if (m.cosmetic_allowed === false) {
      cosmeticCardHtml = `
        <div class="reg-card reg-no" style="margin-top: 8px;">
          <div class="reg-title" style="font-size: 13px; font-weight: bold; display: flex; align-items: center; gap: 6px;">
            <span>⚠️ 식약처 미등록 (별도 확인 필요)</span>
          </div>
          <div class="reg-body" style="margin-top: 6px; font-size: 12px; line-height: 1.6; color:#633806;">식약처 원료성분 목록에 없음. 사용 금지가 아니며 신규 원료이거나 다른 명칭으로 등록됐을 수 있음.</div>
        </div>
      `;
    } else {
      cosmeticCardHtml = `
        <div class="reg-card reg-check" style="margin-top: 8px; background: #F5F5F4; border: 0.5px solid #E7E5E4; color: #44403C;">
          <div class="reg-title" style="font-size: 13px; font-weight: bold; color: #44403C;">
            <span>― 성분 정보 없음</span>
          </div>
          <div class="reg-body" style="margin-top: 6px; font-size: 12px; line-height: 1.6; color: #78716C;">해당 소재의 화합물(compounds) 성분 정보가 등록되어 있지 않아 적합성을 판별할 수 없습니다.</div>
        </div>
      `;
    }

    // 6. 분양 가능 여부 및 실물 보유 방법 파싱
    let distributionHtml = '';
    if (distributionCode) {
      distributionHtml = `
        <div class="distrib-wrap">
          <div class="distrib-status">
            <div class="status-dot"></div>
            <div class="status-label">산림바이오소재은행 보유 확인 — 분양 신청 가능</div>
          </div>
          <div class="kv">
            <span class="kv-label">분양 코드</span><span class="kv-val" style="font-family:var(--font-mono);font-size:12px;font-weight:bold;color:#085041;">${distributionCode}</span>
            <span class="kv-label">소재 형태</span><span class="kv-val">${extractionPart || '식물체'} 정밀 추출물 (에탄올/정제수 분획물)</span>
            <span class="kv-label">신청 기관</span><span class="kv-val">${m.source_org || '국립산림과학원 산림바이오소재연구소'}</span>
            <span class="kv-label">신청 자격</span><span class="kv-val">산림청장에게 분양신청서 제출 후 승인 시 누구나 신청 가능 (승인까지 약 14일 소요)</span>
          </div>
          <div style="font-size:11.5px;color:var(--color-text-secondary);margin:12px 0 4px;font-weight:500;display:flex;justify-content:space-between;align-items:flex-end;">
            <span>신청 절차</span>
            <span style="font-size:9px;color:#A8A29E;font-weight:normal;letter-spacing:-0.2px;">농업생명자원 보존·관리 및 이용에 관한 법률 제8조 제1항 기준</span>
          </div>
          <div class="step-row" style="align-items:stretch;">
            <div class="step-box" style="flex:1;line-height:1.4;">① 분양신청서 작성<br/><span style="font-size:9px;color:#78716C;font-weight:normal;letter-spacing:-0.3px;">(농업(산림)생명자원 분양신청서 별지 제1호 서식)</span></div>
            <div class="step-arr">→</div>
            <div class="step-box" style="flex:1;line-height:1.4;">② 분양신청목록 제출<br/><span style="font-size:9px;color:#78716C;font-weight:normal;">(별지 제1-1호 서식)</span></div>
            <div class="step-arr">→</div>
            <div class="step-box" style="flex:1;line-height:1.4;">③ 산림청장 승인<br/><span style="font-size:9px;color:#78716C;font-weight:normal;">(14일 이내)</span></div>
            <div class="step-arr">→</div>
            <div class="step-box last" style="flex:1;line-height:1.4;">④ 분양계약서 작성 후<br/><span style="font-size:9px;color:#78716C;font-weight:normal;">소재 수령</span></div>
          </div>
        </div>
      `;
    } else {
      const speciesName = m.species || m.scientific_name || m.name_ko || '알 수 없음';
      distributionHtml = `
        <div class="distrib-wrap">
          <div class="distrib-status" style="background:#F5F5F4;border-color:#E7E5E4;">
            <div class="status-label" style="color:#57534E;font-weight:bold;">― 직접 분양 코드 미포함 소재</div>
          </div>
          <div style="font-size:12px;color:var(--color-text-secondary);margin:12px 0 8px;font-weight:bold">소재 확보 방법 2가지:</div>
          
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="background:#FAFAFA;border:1px solid #E7E5E4;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:4px;">
              <div style="font-size:12px;font-weight:bold;color:#44403C;">1. NIFoS 산림바이오소재은행 검색</div>
              <div style="font-size:11px;color:#78716C;line-height:1.5;">동일 식물명 또는 학명으로 검색 후 분양 신청 가능 (승인까지 약 14일)<br/>→ nifos.go.kr</div>
              <div style="font-size:11px;color:#085041;font-weight:bold;margin-top:2px;background:#E1F5EE;align-self:flex-start;padding:3px 8px;border-radius:6px;border:1px solid #9FE1CB;">검색어: ${speciesName}</div>
            </div>
            
            <div style="background:#FAFAFA;border:1px solid #E7E5E4;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:4px;">
              <div style="font-size:12px;font-weight:bold;color:#44403C;">2. 국내 천연물 원료 공급사 구매</div>
              <div style="font-size:11px;color:#78716C;line-height:1.5;">한국생약협회 회원사 또는 국내 식물 추출물 공급사를 통해 원료 구매 가능</div>
            </div>
          </div>
        </div>
      `;
    }

    // 7. AI 해석 블록 및 다음 단계 타임라인 데이터 바인딩
    const effectSummaryText = aiResult?.effect_summary || 
      `${m.name_ko}의 천연 추출물 생리활성은 피부 장벽 기능 활성화에 기여도가 높습니다. 제형 개발 시 온도 관리 및 원료 안정화를 위한 마이크로에멀전 적용이 적합합니다.`;
    
    const cosmeticInterpretationText = aiResult?.cosmetic_interpretation || 
      `국내 화장품 원료 배합 규정 및 제한 고시 사항을 우선 검토해야 합니다. 제형 성적과 임상 패키지 자료를 철저히 보완하여 위해성 평가에 대비할 것을 권장합니다.`;

    const timelineItems = aiResult?.timeline || [
      { period: '즉시 — 2주 이내', action: '분양 신청 + 원료사 견적 동시 요청', desc: '산림바이오소재은행 분양(무상)과 원료사 샘플 발주를 병행하여 수령 일정 리스크를 분산합니다.' },
      { period: '1~3개월', action: '안전성 시험 + 기초 제형 개발', desc: 'OECD 439(피부 자극) 기준 시험 실시 · pH 4.0–5.0 범위 에센스 제형 3종 프로토타입 제작 · 안정성 가속 시험(40℃/6주) 진행.' },
      { period: '3~6개월', action: '인체 적용 효능 평가 설계', desc: '주름개선 기능성화장품 목표 시 피부 탄력도·주름 면적 측정 프로토콜 설계 · 한국화장품시험연구원(CKTRI)에 연구 의뢰.' },
      { period: '6개월 이후', action: '제품 양산화 설계 및 INCI 등록', desc: '제형 원료 스펙화 문서를 완료하고 국제 화장품 성분 사전(INCI)에 등재 신청 및 실 양산 생산을 조율합니다.' }
    ];

    const timelineDots = ['tl-dot-teal', 'tl-dot-blue', 'tl-dot-purple', 'tl-dot-gray'];
    const timelineHtml = timelineItems.map((t, tIdx) => {
      const dotClass = timelineDots[tIdx % timelineDots.length];
      const isLast = tIdx === timelineItems.length - 1;
      return `
        <div class="tl-item">
          <div class="tl-line-col">
            <div class="tl-dot ${dotClass}"></div>
            ${isLast ? '' : '<div class="tl-connector"></div>'}
          </div>
          <div class="tl-content">
            <div class="tl-period">${t.period}</div>
            <div class="tl-action">${t.action}</div>
            <div class="tl-desc">${t.desc}</div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <!-- 소재 상세 리포트 페이지: ${m.name_ko} -->
      <div class="page">
        <!-- [커버 헤더] -->
        <div class="report-header">
          <div class="logo-row">
            <div class="logo">ForestMol AI — R&D 소재 검토 리포트</div>
            <div class="meta-pills">
              <span class="mpill">${formattedDate}</span>
              <span class="mpill">버전 1.0</span>
              <span class="mpill">${template === 'internal' ? '사내 R&D 검토용' : '고객사 제출용'}</span>
            </div>
          </div>
          <div class="report-title">${m.name_ko} (${m.species})</div>
          <div class="report-sub">${project.name} ${project.clientName ? `/ ${project.clientName} ` : ''}검토 제안 리포트</div>
          <div class="tag-row">
            ${headerTags.map(tag => `<span class="tag ${tag === m.region?.split(/[\s,]+/)[0] ? 'tag-purple' : (tag === '공공데이터' || tag === m.source_org?.split(' ')[0] ? 'tag-blue' : '')}">${tag}</span>`).join('')}
          </div>
        </div>

        <!-- [§1 소재 개요] (불필요 필드 제거: 과명, 채취 적기 삭제) -->
        <div class="sec">
          <div class="sec-head">
            <div class="sec-num n1">1</div>
            <div class="sec-title">검토 소재 개요</div>
            <span class="sec-badge tag">DB 직접 조회</span>
          </div>
          <div class="kv">
            <span class="kv-label">국문명</span><span class="kv-val">${m.name_ko}</span>
            <span class="kv-label">학명</span><span class="kv-val"><i>${m.species}</i></span>
            ${distributionText ? `<span class="kv-label">주요 자생지</span><span class="kv-val">${distributionText}</span>` : ''}
            <span class="kv-label">출처기관</span><span class="kv-val">${m.source_org || m.data_source || '정보 없음'}</span>
            ${extractionPart ? `<span class="kv-label">추출 부위</span><span class="kv-val">${extractionPart}</span>` : ''}
            ${extractionSolvent ? `<span class="kv-label">추출 용매</span><span class="kv-val">${extractionSolvent}</span>` : ''}
            ${extractionMethod ? `<span class="kv-label">추출 방법</span><span class="kv-val">${extractionMethod}</span>` : ''}
            ${harvestMethod ? `<span class="kv-label">채취 방법</span><span class="kv-val" style="font-size:11px;line-height:1.6;">${harvestMethod}</span>` : ''}
            ${distributionCode ? `<span class="kv-label">분양 코드</span><span class="kv-val">${distributionCode}</span>` : ''}
            <span class="kv-label">대표 구조식</span>
            <span class="kv-val">
              ${m.pubchem_cid ? 
                `<div style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px; margin-top: 4px;">
                  <img src="https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${m.pubchem_cid}/PNG" alt="Structure Formula" style="width: 120px; border: 0.5px solid var(--color-border-secondary); padding: 4px; background: white; border-radius: 4px;" />
                  <span style="font-size: 10px; color: var(--color-text-tertiary);">출처: PubChem (NIH)</span>
                 </div>` : 
                `<span style="color: var(--color-text-tertiary); font-style: italic;">[구조식 정보 없음]</span>`
              }
            </span>
          </div>
          ${sec1Tags.length > 0 ? `
          <div style="margin-top: 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="font-size: 11px; font-weight: 600; color: var(--color-text-secondary); margin-right: 4px;">확인된 효능</span>
            ${sec1Tags.map(tag => `<span style="background: #E1F5EE; color: #085041; border-radius: 100px; padding: 4px 10px; font-size: 10pt; font-weight: 500;">${tag}</span>`).join('')}
          </div>
          ` : ''}
        </div>

        <!-- [§2 생물활성 데이터] (효능 태그 렌더링으로 전면 교체) -->
        <div class="sec" style="${hasBioactivity ? '' : 'display: none;'}">
          <div class="sec-head">
            <div class="sec-num n2">2</div>
            <div class="sec-title">주요 효능 및 생리활성 분석</div>
            <span class="sec-badge tag-blue">AI 해석 포함</span>
          </div>
          ${bioTagsHtml}
          <div class="ai-block">
            <div class="ai-label">AI 해석 — ForestMol AI 생성</div>
            ${effectSummaryText}
          </div>
        </div>

        <!-- [§2-B 주요 성분 목록] (동적 삽입) -->
        ${compoundsSectionHtml}

        <!-- [§2-C 대사 경로 및 효소] (동적 삽입) -->
        ${keggSectionHtml}

        <!-- [§3 특허 현황] -->
        <div class="sec">
          <div class="sec-head">
            <div class="sec-num n3">3</div>
            <div class="sec-title">특허 현황 (KIPRIS)</div>
            ${m.patent_count === null
              ? '<span class="sec-badge" style="background:#F5F5F4;color:#78716C;border:0.5px solid #E7E5E4">연동 준비 중</span>'
              : (m.patent_count > 0
                  ? '<span class="sec-badge tag-purple" style="background:#FAEEDA;color:#633806;border:0.5px solid #FAC775">✕ 특허 존재 (권리 범위 확인 권장)</span>'
                  : '<span class="sec-badge tag" style="background:#E1F5EE;color:#085041;border:0.5px solid #9FE1CB">✓ 안전 (선행특허 없음)</span>')
            }
          </div>
          ${m.patent_count === null ? `
          <div style="padding: 14px 16px; background: #FAF7F0; border: 0.5px solid #E7E5E4; border-radius: 8px; font-size: 12px; color: #78716C; line-height: 1.7;">
            KIPRIS API 연동 준비 중입니다.<br/>
            소재명 <b>${m.name_ko}</b>으로
            <a href="https://www.kipris.or.kr/khome/main.do" style="color:#2D5016;text-decoration:underline;">kipris.or.kr</a>
            에서 직접 검색하시기 바랍니다.
          </div>
          ` : `
          <div class="patent-row" style="margin-bottom: 12px;">
            <div class="patent-card" style="text-align: left; padding: 12px 16px; background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); border-radius: 6px; display: inline-block; min-width: 200px;">
              <div class="patent-label" style="font-size: 11.5px; color: var(--color-text-tertiary);">KIPRIS 특허 조회 결과</div>
              <div class="patent-num" style="font-size: 22px; font-weight: 700; color: var(--color-text-primary); margin-top: 4px;">총 ${m.patent_count}건</div>
            </div>
          </div>
          
          ${Array.isArray(m.patents) && m.patents.length > 0 ? `
          <table class="tbl" style="margin-top: 8px;">
            <colgroup>
              <col style="width:50%;">
              <col style="width:30%;">
              <col style="width:20%;">
            </colgroup>
            <thead>
              <tr>
                <th style="text-align:left;">상위 특허명</th>
                <th style="text-align:center;">출원인</th>
                <th style="text-align:center;">날짜/상태</th>
              </tr>
            </thead>
            <tbody>
              ${m.patents.map(pt => `
              <tr>
                <td style="text-align:left; font-weight:bold; color:var(--color-text-primary);">${pt.title || '-'}</td>
                <td style="text-align:center;">${pt.applicant || '-'}</td>
                <td style="text-align:center;">
                  <div>${pt.date || '-'}</div>
                  <span style="font-size:10px; color:#555; background:#eee; padding:2px 4px; border-radius:3px;">${pt.status || '-'}</span>
                </td>
              </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="text-align:right; margin-top: 8px;">
            <a href="https://www.kipris.or.kr/khome/main.do#?query=${encodeURIComponent(m.name_ko)}" target="_blank" style="font-size:12px; font-weight:bold; color:#0F6E56; text-decoration:underline;">
              KIPRIS에서 전체 ${m.patent_count}건 보기 →
            </a>
          </div>
          ` : ''}

          <div style="font-size:11px;color:var(--color-text-tertiary);margin-top:8px">KIPRIS 조회 기준: 실시간 API · 검색어: ${m.name_ko}</div>
          `}
        </div>

        <!-- [§3-B 관련 논문 (PubMed)] -->
        ${Array.isArray(m.papers) && m.papers.length > 0 ? `
        <div class="sec">
          <div class="sec-head">
            <div class="sec-num n3" style="font-size: 10px; font-weight: bold; background: #E1F5EE; color: #085041;">3-B</div>
            <div class="sec-title">관련 논문 (PubMed)</div>
            <span class="sec-badge tag" style="background:#E1F5EE;color:#085041;border:0.5px solid #9FE1CB">학술 연구 링크</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 14px;">
            ${m.papers.map(paper => `
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <div style="font-size: 12.5px; font-weight: bold; color: var(--color-text-primary); line-height: 1.4;">${paper.title}</div>
                <div style="font-size: 11px; color: var(--color-text-tertiary);">${paper.authors} · ${paper.journal} · ${paper.year}</div>
                <div style="margin-top: 2px;">
                  <a href="${paper.url}" target="_blank" style="font-size: 11px; font-weight: bold; color: #2D5016; text-decoration: none;">→ PubMed에서 보기 [외부 링크]</a>
                </div>
              </div>
            `).join('')}
          </div>
          <div style="margin-top: 12px; padding: 8px 10px; background: var(--color-background-secondary); border-radius: 6px; border: 0.5px solid var(--color-border-tertiary); font-size: 10px; color: var(--color-text-tertiary); line-height: 1.5;">
            ※ ForestMol은 링크만 제공하며 논문 내용을 요약하거나 보증하지 않습니다.
          </div>
        </div>
        ` : ''}

        <!-- [§4 화장품 원료 적합성] (cosmetic_allowed 단일 카드 노출) -->
        <div class="sec">
          <div class="sec-head">
            <div class="sec-num n4">4</div>
            <div class="sec-title">화장품 원료 적합성</div>
            <span class="sec-badge tag-blue">규제 안전 검증</span>
          </div>
          ${cosmeticCardHtml}
          <div class="ai-block" style="margin-top:10px">
            <div class="ai-label">AI 해석 — ForestMol AI 생성</div>
            ${cosmeticInterpretationText}
          </div>
        </div>

        <!-- [§5 분양 가능 여부] -->
        <div class="sec">
          <div class="sec-head">
            <div class="sec-num n5">5</div>
            <div class="sec-title">분양 가능 여부 및 소재 확보 방법</div>
            <span class="sec-badge tag" style="background:#E1F5EE;color:#085041;border:0.5px solid #9FE1CB">${distributionCode ? '분양 가능' : '협의 필요'}</span>
          </div>
          ${distributionHtml}
        </div>

        <!-- [§6 다음 단계] -->
        <div class="sec" style="margin-bottom: 20px;">
          <div class="sec-head">
            <div class="sec-num n6">6</div>
            <div class="sec-title">다음 단계 권장사항</div>
            <span class="sec-badge tag-purple">AI 전체 생성</span>
          </div>
          <div class="timeline">
            ${timelineHtml}
          </div>
        </div>

        <!-- 면책 고지 -->
        <div class="disclaimer">
          <b style="font-weight:500">면책 고지</b> — 본 리포트는 산림청·식약처·특허청 공개 데이터 및 AI 분석 기반 참고 자료입니다. 원료 채택·규제 허가 판단은 반드시 천연물 전문가 검토를 거쳐야 합니다. ForestMol AI는 리포트 내용의 상업적 활용 결과에 대해 법적 책임을 지지 않습니다.
        </div>

        <!-- 워터마크 바 -->
        <div class="watermark-bar">
          <span>ForestMol AI · forestmol.com</span>
          <span style="background:#E1F5EE;color:#085041;padding:2px 8px;border-radius:4px;font-weight:500">Pro 플랜 — 워터마크 없음</span>
        </div>
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[ForestMol] ${project.name} R&D 제안 리포트</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&family=DM+Mono:wght@400;500&display=swap');
    
    :root {
      --color-background-primary: #ffffff;
      --color-background-secondary: #FAF7F0;
      --color-border-secondary: #E7E5E4;
      --color-border-tertiary: #E7E5E4;
      --color-text-primary: #1C1917;
      --color-text-secondary: #44403C;
      --color-text-tertiary: #78716C;
      --color-text-info: #1D9E75;
      --font-sans: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: 'DM Mono', monospace;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: var(--font-sans);
      background-color: #FAF7F0;
      color: var(--color-text-primary);
      line-height: 1.6;
      padding: 40px 0;
      -webkit-print-color-adjust: exact;
    }
    .page {
      background: var(--color-background-primary);
      border: 0.5px solid var(--color-border-secondary);
      border-radius: 12px;
      padding: 36px 40px;
      max-width: 680px;
      margin: 0 auto 30px auto;
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
      page-break-after: always;
      break-after: page;
      position: relative;
    }
    .page:last-child {
      margin-bottom: 0;
      page-break-after: avoid;
      break-after: avoid;
    }
    .report-header {
      border-bottom: 1.5px solid var(--color-border-secondary);
      padding-bottom: 20px;
      margin-bottom: 28px;
    }
    .logo-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .logo {
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text-tertiary);
      letter-spacing: .04em;
    }
    .meta-pills {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .mpill {
      font-size: 10.5px;
      padding: 2px 8px;
      border-radius: 4px;
      border: 0.5px solid var(--color-border-tertiary);
      color: var(--color-text-secondary);
      background: var(--color-background-secondary);
    }
    .report-title {
      font-size: 22px;
      font-weight: 500;
      color: var(--color-text-primary);
      margin-bottom: 6px;
    }
    .report-sub {
      font-size: 13px;
      color: var(--color-text-secondary);
      margin-bottom: 14px;
    }
    .tag-row {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .tag {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      background: #E1F5EE;
      color: #085041;
      border: 0.5px solid #9FE1CB;
    }
    .tag-blue {
      background: #E6F1FB;
      color: #185FA5;
      border: 0.5px solid #B5D4F4;
    }
    .tag-purple {
      background: #EEEDFE;
      color: #3C3489;
      border: 0.5px solid #CECBF6;
    }
    .sec {
      margin-bottom: 32px;
    }
    .sec-head {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 14px;
      padding-bottom: 8px;
      border-bottom: 0.5px solid var(--color-border-tertiary);
    }
    .sec-num {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      font-size: 11px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .n1 { background: #E1F5EE; color: #085041; }
    .n2 { background: #E6F1FB; color: #185FA5; }
    .n3 { background: #EEEDFE; color: #3C3489; }
    .n4 { background: #FAEEDA; color: #633806; }
    .n5 { background: #FAECE7; color: #712B13; }
    .n6 { background: var(--color-background-secondary); color: var(--color-text-secondary); border: 0.5px solid var(--color-border-secondary); }

    .sec-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--color-text-primary);
    }
    .sec-badge {
      font-size: 10px;
      padding: 1px 7px;
      border-radius: 3px;
      margin-left: auto;
    }
    .kv {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 5px 12px;
      font-size: 12.5px;
      line-height: 1.7;
    }
    .kv-label {
      color: var(--color-text-tertiary);
    }
    .kv-val {
      color: var(--color-text-primary);
    }
    .src {
      font-size: 10px;
      padding: 1px 5px;
      border-radius: 3px;
      background: var(--color-background-secondary);
      color: var(--color-text-tertiary);
      border: 0.5px solid var(--color-border-tertiary);
      margin-left: 4px;
      vertical-align: middle;
    }
    .tbl {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-top: 8px;
    }
    .tbl th {
      padding: 7px 10px;
      font-weight: 500;
      font-size: 11px;
      text-align: left;
      background: var(--color-background-secondary);
      border: 0.5px solid var(--color-border-tertiary);
      color: var(--color-text-secondary);
    }
    .tbl td {
      padding: 7px 10px;
      border: 0.5px solid var(--color-border-tertiary);
      vertical-align: top;
      line-height: 1.5;
    }
    .ai-block {
      background: var(--color-background-secondary);
      border-left: 2px solid #1D9E75;
      border-radius: 0 6px 6px 0;
      padding: 10px 12px;
      font-size: 12.5px;
      color: var(--color-text-secondary);
      line-height: 1.75;
      margin-top: 10px;
    }
    .ai-label {
      font-size: 10px;
      font-weight: 500;
      color: #0F6E56;
      margin-bottom: 4px;
      letter-spacing: .04em;
    }
    .patent-row {
      display: flex;
      gap: 10px;
      margin-top: 8px;
      flex-wrap: wrap;
    }
    .patent-card {
      background: var(--color-background-secondary);
      border: 0.5px solid var(--color-border-tertiary);
      border-radius: 6px;
      padding: 8px 12px;
      flex: 1;
      min-width: 100px;
    }
    .patent-num {
      font-size: 20px;
      font-weight: 500;
      color: var(--color-text-primary);
    }
    .patent-label {
      font-size: 11px;
      color: var(--color-text-tertiary);
    }
    .reg-row {
      display: flex;
      gap: 10px;
      margin-top: 4px;
      flex-wrap: wrap;
    }
    .reg-card {
      flex: 1;
      border-radius: 6px;
      padding: 10px 12px;
      min-width: 120px;
    }
    .reg-ok {
      background: #E1F5EE;
      border: 0.5px solid #9FE1CB;
      color: #085041;
    }
    .reg-no {
      background: #FAEEDA;
      border: 0.5px solid #FAC775;
      color: #633806;
    }
    .reg-check {
      background: #F5F5F4;
      border: 0.5px solid #E7E5E4;
      color: #44403C;
    }
    .reg-title {
      font-size: 11px;
      font-weight: 500;
      margin-bottom: 4px;
    }
    .reg-body {
      font-size: 11.5px;
      line-height: 1.6;
    }
    .distrib-wrap {
      background: var(--color-background-secondary);
      border-radius: 8px;
      padding: 14px 16px;
    }
    .distrib-status {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #1D9E75;
    }
    .status-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text-primary);
    }
    .step-row {
      display: flex;
      align-items: center;
      margin: 12px 0;
      flex-wrap: wrap;
      gap: 4px;
    }
    .step-box {
      background: var(--color-background-primary);
      border: 0.5px solid var(--color-border-secondary);
      border-radius: 5px;
      padding: 6px 10px;
      font-size: 11.5px;
      color: var(--color-text-primary);
    }
    .step-arr {
      font-size: 11px;
      color: var(--color-text-tertiary);
      margin: 0 2px;
    }
    .step-box.last {
      background: #E1F5EE;
      border-color: #9FE1CB;
      color: #085041;
    }
    .timeline {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .tl-item {
      display: flex;
      gap: 12px;
    }
    .tl-line-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 20px;
    }
    .tl-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid;
      flex-shrink: 0;
      margin-top: 4px;
    }
    .tl-dot-teal { border-color: #1D9E75; background: #E1F5EE; }
    .tl-dot-blue { border-color: #378ADD; background: #E6F1FB; }
    .tl-dot-purple { border-color: #7F77DD; background: #EEEDFE; }
    .tl-dot-gray { border-color: var(--color-border-secondary); background: var(--color-background-secondary); }

    .tl-connector {
      flex: 1;
      width: 1px;
      background: var(--color-border-tertiary);
    }
    .tl-content {
      padding-bottom: 16px;
      flex: 1;
    }
    .tl-period {
      font-size: 11px;
      color: var(--color-text-tertiary);
      margin-bottom: 3px;
    }
    .tl-action {
      font-size: 12.5px;
      font-weight: 500;
      color: var(--color-text-primary);
      margin-bottom: 2px;
    }
    .tl-desc {
      font-size: 11.5px;
      color: var(--color-text-secondary);
      line-height: 1.6;
    }
    .disclaimer {
      background: var(--color-background-secondary);
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 11px;
      color: var(--color-text-tertiary);
      line-height: 1.7;
      margin-top: 28px;
      border: 0.5px solid var(--color-border-tertiary);
    }
    .watermark-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 0.5px solid var(--color-border-tertiary);
      font-size: 11px;
      color: var(--color-text-tertiary);
    }
    
    @media print {
      body {
        background-color: #FFFFFF !important;
        padding: 0 !important;
      }
      .page {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
        page-break-after: always;
        break-after: page;
      }
      .page:last-child {
        page-break-after: avoid;
        break-after: avoid;
      }
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>
  `;
}
