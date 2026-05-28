// bioactivity 파싱 및 필터링 함수 로컬 테스트용
function parseBioactivity(bioactivity) {
  if (!bioactivity) return [];
  const rawItems = Array.isArray(bioactivity) ? bioactivity : [bioactivity];
  const items = [];
  
  for (const rawItem of rawItems) {
    if (typeof rawItem !== 'string') continue;
    
    // 1. | 이나 / 로 먼저 split 하여 카테고리/그룹 분리
    const categoryParts = rawItem.split(/[|/]/);
    
    for (const catPart of categoryParts) {
      // 2. 카테고리 접두어 제거 (예: "약용:", "식용:", "약용 :", "식용 :")
      const withoutPrefix = catPart.trim().replace(/^[가-힣a-zA-Z\s]+:\s*/, '');
      
      // 3. ',' 또는 ';'로 split
      const parts = withoutPrefix.split(/[,;]/);
      for (const part of parts) {
        let cleaned = part.trim();
        
        // " 등" 제거 (예: "화상 등" -> "화상")
        cleaned = cleaned.replace(/\s+등$/, '').trim();
        
        // 제외 조건:
        // - 빈 문자열 ""
        // - ":" 단독
        // - "정보", "information", "info" (대소문자 무시)
        // - "Residue", "residue" (대소문자 무시)
        // - 글자 수 1자 이하
        if (!cleaned) continue;
        if (cleaned === ':') continue;
        const lower = cleaned.toLowerCase();
        if (lower === '정보' || lower === 'information' || lower === 'info') continue;
        if (lower === 'residue') continue;
        if (cleaned.length <= 1) continue;
        
        // 설명조 문장 및 복용법 예외 필터링 (태그에 맞지 않는 긴 지침이나 문장 제외)
        if (cleaned.length > 20) continue;
        if (cleaned.includes('복용') || cleaned.includes('채취') || cleaned.includes('사용') || cleaned.includes('하거나') || cleaned.includes('☞') || cleaned.startsWith('(')) continue;
        
        items.push(cleaned);
      }
    }
  }
  
  // 중복 제거
  return Array.from(new Set(items));
}

const testCases = [
  {
    name: "잣나무",
    bioactivity: [
      "간질, 감기, 강장보호, 건비, 고혈압, 골절번통, 관절염, 기관지염, 당뇨병, 두현, 변비, 식풍, 신허, 양음, 오로보호, 윤장, 윤폐, 이명, 임신중독증, 자양강장, 정력증진, 조해, 종독, 종창, 중풍, 진통, 청명, 토혈, 폐결핵, 폐기천식, 풍비, 해수, 허약체질, 화상 등",
      "구과를 가을에 채취하여 씨껍질을 벗긴 후 사용한다.",
      "(내복): 탕전(湯煎)하거나, 가루약 또는 환제로 복용한다. ☞ 대변이 묽을 때는 사용을 삼간다."
    ]
  },
  {
    name: "사람주나무 Residue",
    bioactivity: [
      "Residue"
    ]
  },
  {
    name: "사람주나무 EA",
    bioactivity: [
      "Ethyl Acetate(EA)"
    ]
  },
  {
    name: "형식 A 테스트",
    bioactivity: "항균; 항산화; 항염"
  },
  {
    name: "형식 B 테스트",
    bioactivity: "약용: 종풍, 손발 저림 / 식용: 견과"
  },
  {
    name: "형식 D 테스트",
    bioactivity: "약용:종풍,손발저림,현기증|식용:견과,죽"
  }
];

for (const tc of testCases) {
  const result = parseBioactivity(tc.bioactivity);
  console.log(`[${tc.name}] ->`, result);
}
