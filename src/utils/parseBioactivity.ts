export function parseBioactivityTags(
  bioactivity: string | string[] | null | undefined,
  limit?: number
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
    .filter(t =>
      t.length > 1 &&
      t.length < 15 &&        // 15자 이상 긴 항목 제거
      !t.includes(':') &&
      !t.includes('(') &&
      !t.includes('■') &&     // 논문 구분자 제거
      !t.includes('http') &&  // URL 제거
      !t.match(/\d{4}/) &&    // 연도 포함 항목 제거
      t !== '정보' &&
      t !== 'Residue' &&
      t !== 'information'
    );

  // limit 있으면 잘라서 반환
  return limit ? tags.slice(0, limit) : tags;
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
