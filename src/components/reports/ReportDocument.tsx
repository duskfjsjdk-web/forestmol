import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import '../../lib/pdf-fonts'; // 폰트 등록 헬퍼 실행 보장


// ────────────────────────────────────────────────────────
// PDF 리포트 문서의 디자인 테마 및 스타일 시트 (Premium Aesthetic)
// ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  coverPage: {
    padding: 50,
    backgroundColor: '#F2EFE6', // 표지 오가닉 베이지 톤
    color: '#1C1917',
    fontFamily: 'NotoSansKR',
  },
  page: {
    padding: 50,
    backgroundColor: '#FAF7F0', // 백그라운드 크림 톤
    color: '#1C1917',
    fontFamily: 'NotoSansKR',
  },

  
  // ─── [표지 스타일] ───
  coverContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  coverHeader: {
    borderBottomWidth: 2,
    borderBottomColor: '#2D5016',
    paddingBottom: 20,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D5016',
    letterSpacing: 2,
  },
  coverTitleContainer: {
    marginVertical: 100,
  },
  coverTag: {
    fontSize: 10,
    color: '#2D5016',
    fontWeight: 'bold',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1917',
    lineHeight: 1.3,
  },
  coverSubtitle: {
    fontSize: 12,
    color: '#78716C',
    marginTop: 15,
    lineHeight: 1.5,
  },
  coverMeta: {
    borderTopWidth: 1,
    borderTopColor: '#E7E5E4',
    paddingTop: 20,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 6,
    fontSize: 10,
    color: '#78716C',
  },
  metaLabel: {
    width: 80,
    color: '#A8A29E',
  },
  metaValue: {
    color: '#44403C',
    fontWeight: 'bold',
  },

  // ─── [공통 본문 스타일] ───
  section: {
    marginBottom: 25,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E7E5E4',
    paddingBottom: 8,
    marginBottom: 25,
  },
  pageHeaderTitle: {
    fontSize: 9,
    color: '#2D5016',
    fontWeight: 'bold',
  },
  pageHeaderRight: {
    fontSize: 9,
    color: '#A8A29E',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 15,
  },

  // ─── [요약 테이블 스타일] ───
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2D5016',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E7E5E4',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
  },
  tableCell: {
    fontSize: 9,
    color: '#44403C',
  },

  // ─── [소재별 상세 스타일] ───
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  detailTitleContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F4',
    paddingBottom: 10,
    marginBottom: 12,
  },
  detailNameKo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1917',
  },
  detailSpecies: {
    fontSize: 10,
    color: '#78716C',
    marginTop: 4,
  },

  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  gridItem: {
    width: '50%',
    marginBottom: 10,
  },
  gridLabel: {
    fontSize: 9,
    color: '#A8A29E',
    marginBottom: 3,
  },
  gridValue: {
    fontSize: 10,
    color: '#44403C',
    fontWeight: 'medium',
  },
  bulletList: {
    marginTop: 6,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bulletDot: {
    width: 10,
    fontSize: 10,
    color: '#2D5016',
  },
  bulletText: {
    fontSize: 9.5,
    color: '#44403C',
    flex: 1,
  },

  // ─── [면책 조항 & 안내 스타일] ───
  disclaimerBox: {
    backgroundColor: '#F5F5F4',
    borderRadius: 10,
    padding: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#A8A29E',
    marginTop: 30,
  },
  disclaimerTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#44403C',
    marginBottom: 6,
  },
  disclaimerText: {
    fontSize: 9,
    color: '#78716C',
    lineHeight: 1.5,
  },
  footerText: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    textAlign: 'center',
    fontSize: 8,
    color: '#A8A29E',
    borderTopWidth: 1,
    borderTopColor: '#F5F5F4',
    paddingTop: 10,
  }
});

interface ReportDocumentProps {
  project: {
    name: string;
    clientName?: string;
    description?: string;
  };
  materials: Array<{
    id: string;
    name_ko: string;
    species: string;
    data_source: string;
    source_org: string;
    bioactivity?: string[] | string;
    compounds?: string[] | string;
    patent_count?: number;
    patents?: any[] | string;
    kegg_pathways?: Array<{ id: string; name: string }>;
    kegg_enzymes?: Array<{ id: string; name: string }>;
  }>;
  template: 'internal' | 'client';
  options: {
    includePatents: boolean;
    includeCompounds: boolean;
    includeSources: boolean;
    includeBioactivity: boolean;
  };
  creatorEmail?: string;
}

export const ReportDocument: React.FC<ReportDocumentProps> = ({
  project,
  materials = [],
  template = 'client',
  options,
  creatorEmail = '연구팀',
}) => {
  const currentDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // bioactivity 파싱 헬퍼
  const getBioactivities = (m: any) => {
    if (!m.bioactivity) return [];
    if (Array.isArray(m.bioactivity)) return m.bioactivity;
    try {
      const parsed = JSON.parse(m.bioactivity);
      return Array.isArray(parsed) ? parsed : [String(m.bioactivity)];
    } catch {
      return String(m.bioactivity).split(',').map(s => s.trim());
    }
  };

  // compounds 파싱 헬퍼 (상위 5개)
  const getCompounds = (m: any) => {
    if (!m.compounds) return [];
    let list: string[] = [];
    if (Array.isArray(m.compounds)) {
      list = m.compounds;
    } else {
      try {
        const parsed = JSON.parse(m.compounds);
        list = Array.isArray(parsed) ? parsed : [String(m.compounds)];
      } catch {
        list = String(m.compounds).split(',').map(s => s.trim());
      }
    }
    return list.slice(0, 5);
  };

  // 특허 개수 계산 또는 파싱
  const getPatentText = (m: any) => {
    if (m.patent_count !== undefined) return `${m.patent_count}건`;
    if (m.patents) {
      if (Array.isArray(m.patents)) return `${m.patents.length}건`;
      try {
        const parsed = JSON.parse(m.patents);
        if (Array.isArray(parsed)) return `${parsed.length}건`;
      } catch {}
    }
    return '조회 완료';
  };

  return (
    <Document>
      {/* ────────────────────────────────────────────────────────
          PAGE 1: 표지 (Cover Page)
          ──────────────────────────────────────────────────────── */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverContainer}>
          {/* 헤더 */}
          <View style={styles.coverHeader}>
            <Text style={[styles.logoText, { fontSize: 32, letterSpacing: 3 }]}>ForestMol</Text>
          </View>


          {/* 중앙 타이틀 */}
          <View style={styles.coverTitleContainer}>
            <Text style={styles.coverTag}>
              {template === 'internal' ? 'Internal Review Report' : 'Ingredient Proposal'}
            </Text>
            <Text style={styles.coverTitle}>{project.name}</Text>
            <Text style={styles.coverSubtitle}>
              {project.description || '산림 공공데이터 7종 및 특허 분석 기반 천연 화장품 소재 제안서'}
            </Text>
          </View>

          {/* 메타 데이터 */}
          <View style={styles.coverMeta}>
            {project.clientName && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>제출처 (고객사)</Text>
                <Text style={styles.metaValue}>{project.clientName}</Text>
              </View>
            )}
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>보고서 구분</Text>
              <Text style={styles.metaValue}>
                {template === 'internal' ? '내부 검토용 (팀 코멘트 포함)' : '고객사 제출용'}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>생성 일자</Text>
              <Text style={styles.metaValue}>{currentDate}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>작성 담당자</Text>
              <Text style={styles.metaValue}>{creatorEmail}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.footerText}>© ForestMol AI - R&D Material Intelligence Platform</Text>
      </Page>

      {/* ────────────────────────────────────────────────────────
          PAGE 2: 소재 요약 테이블 (Table Page)
          ──────────────────────────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageHeaderTitle}>{project.name} - 소재 요약</Text>
          <Text style={styles.pageHeaderRight}>Page 2</Text>
        </View>

        <Text style={styles.pageTitle}>천연 소재 요약 목록</Text>

        <View style={styles.table}>
          {/* 테이블 헤더 */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '25%' }]}>소재명 (학명)</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>출처 기관</Text>
            <Text style={[styles.tableHeaderCell, { width: '35%' }]}>주요 효능 및 생리활성</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>특허 상태</Text>
          </View>

          {/* 테이블 로우 */}
          {materials.map((m, index) => {
            const bios = getBioactivities(m).slice(0, 2).join(', ');
            return (
              <View key={m.id || index} style={styles.tableRow}>
                <View style={{ width: '25%' }}>
                  <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{m.name_ko}</Text>
                  <Text style={[styles.tableCell, { color: '#78716C', fontSize: 7, marginTop: 2 }]}>
                    {m.species}
                  </Text>
                </View>
                <Text style={[styles.tableCell, { width: '20%' }]}>{m.source_org || m.data_source}</Text>
                <Text style={[styles.tableCell, { width: '35%', paddingRight: 5 }]}>
                  {bios || '연구 진행 중'}
                </Text>
                <Text style={[styles.tableCell, { width: '20%', fontWeight: 'medium' }]}>
                  {getPatentText(m)}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.footerText}>© ForestMol AI - R&D Material Intelligence Platform</Text>
      </Page>

      {/* ────────────────────────────────────────────────────────
          PAGE 3~: 소재별 상세 페이지 (Material Details)
          ──────────────────────────────────────────────────────── */}
      {materials.map((m, index) => (
        <Page key={m.id || index} size="A4" style={styles.page}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageHeaderTitle}>{project.name} - 소재 상세</Text>
            <Text style={styles.pageHeaderRight}>Page {index + 3}</Text>
          </View>

          <View style={styles.detailCard}>
            <View style={styles.detailTitleContainer}>
              <Text style={styles.detailNameKo}>{m.name_ko}</Text>
              <Text style={styles.detailSpecies}>{m.species}</Text>
            </View>

            {/* 그리드 정보 */}
            <View style={styles.gridRow}>
              {options.includeSources && (
                <>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>제공 출처</Text>
                    <Text style={styles.gridValue}>{m.data_source}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>수집 기관</Text>
                    <Text style={styles.gridValue}>{m.source_org}</Text>
                  </View>
                </>
              )}
              {options.includePatents && (
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>특허 선행 조사</Text>
                  <Text style={styles.gridValue}>{getPatentText(m)}</Text>
                </View>
              )}
            </View>

            {/* 생리활성 / 효능 */}
            {options.includeBioactivity && (
              <View style={styles.section}>
                <Text style={[styles.gridLabel, { color: '#2D5016', fontWeight: 'bold' }]}>
                  주요 생리활성 및 연구 효능
                </Text>
                <View style={styles.bulletList}>
                  {getBioactivities(m).length > 0 ? (
                    getBioactivities(m).map((bio: any, bIdx: number) => (
                      <View key={bIdx} style={styles.bulletItem}>
                        <Text style={styles.bulletDot}>•</Text>
                        <Text style={styles.bulletText}>
                          {typeof bio === 'object' && bio !== null
                            ? String(bio.activity || JSON.stringify(bio))
                            : String(bio)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.bulletText, { color: '#A8A29E' }]}>수집된 생리활성 정보가 없습니다.</Text>
                  )}
                </View>
              </View>
            )}

            {/* 주요 성분 */}
            {options.includeCompounds && (
              <View style={styles.section}>
                <Text style={[styles.gridLabel, { color: '#2D5016', fontWeight: 'bold' }]}>
                  KNApSAck 함유 지표 성분 (상위 5개)
                </Text>
                <View style={styles.bulletList}>
                  {getCompounds(m).length > 0 ? (
                    getCompounds(m).map((cmp, cIdx) => (
                      <View key={cIdx} style={styles.bulletItem}>
                        <Text style={styles.bulletDot}>-</Text>
                        <Text style={styles.bulletText}>
                          {typeof cmp === 'object' && cmp !== null
                            ? `${(cmp as any).name || '성분명 없음'} ${(cmp as any).formula ? `(${(cmp as any).formula})` : ''}`
                            : String(cmp)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.bulletText, { color: '#A8A29E' }]}>동정된 성분 분석 정보가 없습니다.</Text>
                  )}
                </View>
              </View>
            )}

            {/* KEGG 대사 경로 및 효소 섹션 */}
            {((m.kegg_pathways && m.kegg_pathways.length > 0) || (m.kegg_enzymes && m.kegg_enzymes.length > 0)) && (
              <View style={styles.section}>
                <Text style={[styles.gridLabel, { color: '#2D5016', fontWeight: 'bold' }]}>
                  §2-C 대사 경로 및 효소 (KEGG)
                </Text>
                <View style={styles.bulletList}>
                  {m.kegg_pathways && m.kegg_pathways.length > 0 && (
                    <View style={styles.bulletItem}>
                      <Text style={styles.bulletDot}>-</Text>
                      <Text style={styles.bulletText}>
                        대사 경로: {m.kegg_pathways.length > 1
                          ? `${m.kegg_pathways[0].name} 외 ${m.kegg_pathways.length - 1}개`
                          : m.kegg_pathways[0].name}
                      </Text>
                    </View>
                  )}
                  {m.kegg_enzymes && m.kegg_enzymes.length > 0 && (
                    <View style={styles.bulletItem}>
                      <Text style={styles.bulletDot}>-</Text>
                      <Text style={styles.bulletText}>
                        관련 효소: EC {m.kegg_enzymes[0].id} ({m.kegg_enzymes[0].name}){m.kegg_enzymes.length > 1 ? ` 외 ${m.kegg_enzymes.length - 1}개` : ''}
                      </Text>
                    </View>
                  )}
                  <View style={styles.bulletItem}>
                    <Text style={styles.bulletDot}>-</Text>
                    <Text style={[styles.bulletText, { color: '#78716C' }]}>
                      출처: KEGG Database
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* 내부 검토 템플릿용 코멘트 란 */}
            {template === 'internal' && (
              <View style={[styles.section, { marginTop: 15, borderTopWidth: 1, borderTopColor: '#F5F5F4', paddingTop: 15 }]}>
                <Text style={[styles.gridLabel, { color: '#78716C', fontWeight: 'bold' }]}>
                  [내부 검토 코멘트] (R&D팀 전용 메모)
                </Text>
                <View style={{ backgroundColor: '#F5F5F4', borderRadius: 8, padding: 10, marginTop: 5 }}>
                  <Text style={[styles.bulletText, { color: '#78716C', fontSize: 8.5 }]}>
                    - 해당 천연 소재는 산림청 공공데이터를 기반으로 수집되었으며, 포뮬레이터 배합 테스트 및 KIPRIS 특허 침해 여부를 내부적으로 선행 조사할 것을 권장합니다.
                  </Text>

                </View>
              </View>
            )}
          </View>

          <Text style={styles.footerText}>© ForestMol AI - R&D Material Intelligence Platform</Text>
        </Page>
      ))}

      {/* ────────────────────────────────────────────────────────
          LAST PAGE: 데이터 출처 및 면책 조항 (Disclaimer Page)
          ──────────────────────────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageHeaderTitle}>{project.name} - 정보 안내 및 면책고지</Text>
          <Text style={styles.pageHeaderRight}>마지막 페이지</Text>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={styles.pageTitle}>데이터 출처 안내</Text>
          
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>✓</Text>
              <Text style={styles.bulletText}>
                본 리포트의 천연 소재 정보는 산림청 및 국립산림과학원(NIFoS)이 개방하는 7종 산림 공공데이터를 근간으로 추출되었습니다.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>✓</Text>
              <Text style={styles.bulletText}>
                지표 성분 정보는 글로벌 대사체 데이터베이스인 KNApSAck을 매핑하여 신뢰성 있는 화학 성분을 도출하였습니다.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>✓</Text>
              <Text style={styles.bulletText}>
                특허 정보는 특허정보원(KIPRIS) OpenAPI 연동을 통하여 추출된 실시간 지식재산권 정보를 기반으로 작성되었습니다.
              </Text>
            </View>
          </View>
        </View>

        {/* 면책 조항 */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerTitle}>※ 법적 면책고지 (Legal Disclaimer)</Text>
          <Text style={styles.disclaimerText}>
            본 보고서에 포함된 데이터 및 AI 추출 제안 내용은 화장품 R&D R&I 연구팀의 소재 탐색 및 기획을 돕기 위해 학술적 참고용으로 가공 및 정렬된 결과입니다. 
            소재의 실제 배합 한도, 안전성, 화장품법상 광고 표시 위반 여부, 그리고 최종 특허권 침해에 관한 법적 책임은 사용 당사자에게 있으며, 
            제조 및 유통 전에 정식 임상실험 및 변리사의 검토를 거쳐야 함을 명시합니다.
          </Text>
        </View>

        <Text style={styles.footerText}>© ForestMol AI - R&D Material Intelligence Platform</Text>
      </Page>
    </Document>
  );
};
