export function parseBioactivityTags(
  bioactivity: string | string[] | null | undefined,
  limit?: number,
  dataSource?: string
): string[] {
  if (!bioactivity) return [];

  // 배열인 경우 첫 번째 항목만 사용
  const raw = Array.isArray(bioactivity)
    ? bioactivity[0]
    : bioactivity;

  if (!raw || typeof raw !== 'string') return [];

  // 쉼표로 split
  const tags = raw
    .split(',')
    .map(t => t.trim())
    // "등" 또는 " 등" 으로 끝나는 마지막 항목 정리
    .map(t => t.replace(/\s*등$/, '').trim())
    // 빈 값, 1글자 이하, 불필요한 값 제거
    .map(t => t.replace(/■/g, '').trim())
    .filter(t =>
      t.length > 1 &&
      t.length < 25 &&        // 15자에서 25자로 완화
      !t.includes(':') &&
      !t.includes('(') &&
      !t.includes('http') &&  // URL 제거
      !t.match(/\d{4}/) &&    // 연도 포함 항목 제거
      t !== '정보' &&
      t !== 'Residue' &&
      t !== 'information'
    );

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

  // 모든 소스(정유은행, 약용식물 등)에 대해 엄격하게 화장품 키워드 화이트리스트만 통과시킴
  const filteredTags = tags.filter(t => COSMETIC_KEYWORDS.some(kw => t.includes(kw) || t.startsWith(kw)));

  return limit ? filteredTags.slice(0, limit) : filteredTags;
}

// 슬라이드오버용 채취·복용 정보 파서
export function parseBioactivityDetail(
  bioactivity: string[] | null | undefined
): { harvest?: string; usage?: string } {
  if (!Array.isArray(bioactivity)) return {};
  return {
    harvest: bioactivity[1] ?? undefined,
    usage: bioactivity[2] ?? undefined,
  };
}
