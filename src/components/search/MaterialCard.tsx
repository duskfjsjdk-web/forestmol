'use client';

import React, { useState, useEffect } from 'react';
import { Bookmark, FlaskConical, Building2 } from 'lucide-react';
import { toggleBookmark, checkBookmarked } from '@/app/actions/bookmark';
import { parseBioactivityTags } from '@/utils/parseBioactivity';

// materials 테이블에서 반환되는 소재 데이터 타입 정의
export interface Material {
  id: string;
  name_ko: string | null;
  name: string | null;
  scientific_name: string | null;
  species: string | null;
  source_org: string | null;
  source_type: string | null;
  data_source: string | null;
  bioactivity: string[] | null;
  compounds: { cas?: string; name: string; formula?: string }[] | null;
  effect: string | null;
  similarity?: number;
  // API에서 가공한 필드
  display_species?: string;
  display_bioactivity?: string;
  kegg_id?: string | null;
  kegg_pathways?: { id: string; name: string }[] | null;
  kegg_enzymes?: { id: string; name: string }[] | null;
  // 식물정유은행 호환용 필드 추가
  name?: string;
  scientific_name?: string;
  usage_method?: string;
}

interface MaterialCardProps {
  material: Material;
  onClick?: () => void;
  isSelected?: boolean;
}

// 데이터 출처 → 필터 라벨 변환 함수
function getSourceLabel(dataSource: string | null): { label: string; color: string } {
  if (!dataSource) return { label: '기타', color: 'bg-stone-100 text-stone-600' };
  if (dataSource.includes('바이오소재')) return { label: '산림바이오소재', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
  if (dataSource.includes('약용') || dataSource.includes('약용식물')) return { label: '산림약용소재', color: 'bg-amber-50 text-amber-700 border border-amber-200' };
  if (dataSource.includes('정유')) return { label: '식물정유은행', color: 'bg-sky-50 text-sky-700 border border-sky-200' };
  return { label: dataSource, color: 'bg-stone-100 text-stone-600' };
}

// 유사도 점수(0~1 혹은 코사인 유사도)를 0~100%로 변환
function getSimilarityPercent(similarity: number | undefined): number {
  if (similarity === undefined || similarity === null) return 0;
  // pgvector 코사인 유사도: -1 ~ 1 범위 → 0~100% 변환
  const pct = ((similarity + 1) / 2) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

// HTML 엔티티 디코딩 함수
function decodeHtmlEntities(str: string | null): string | null {
  if (!str) return null;
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function MaterialCard({ material, onClick, isSelected = false }: MaterialCardProps) {
  console.log('CARD DATA:', {
    name: (material as any).name,
    name_ko: material.name_ko,
    usage_method: (material as any).usage_method,
    bioactivity: material.bioactivity,
    data_source: material.data_source,
  });

  const [bookmarked, setBookmarked] = useState(false);
  const [patentCount, setPatentCount] = useState<number | null>(null);
  const [patentLoading, setPatentLoading] = useState(true);
  const [patentStatus, setPatentStatus] = useState<string | null>(null);

  // 실시간 북마크 상태 체크
  useEffect(() => {
    let active = true;
    const fetchBookmarkStatus = async () => {
      try {
        const isBookmarked = await checkBookmarked(material.id);
        if (active) {
          setBookmarked(isBookmarked);
        }
      } catch (err) {
        console.error('북마크 상태 조회 실패:', err);
      }
    };
    fetchBookmarkStatus();
    return () => {
      active = false;
    };
  }, [material.id]);

  // 소재명을 바탕으로 백엔드 API에서 특허 개수를 가져옵니다.
  useEffect(() => {
    let active = true;
    const fetchPatentCount = async () => {
      const searchQuery = material.name_ko || material.name;
      if (!searchQuery) {
        setPatentCount(0);
        setPatentLoading(false);
        return;
      }

      try {
        setPatentLoading(true);
        const res = await fetch(`/api/patent?query=${encodeURIComponent(searchQuery)}`);
        if (!res.ok) throw new Error('조회 실패');
        
        const data = await res.json();
        if (active) {
          if (data.status === 'unavailable') {
            setPatentStatus('unavailable');
          } else {
            setPatentCount(data.totalCount ?? 0);
            setPatentStatus(null);
          }
        }
      } catch (err) {
        console.error('특허 조회 에러:', err);
        if (active) {
          setPatentCount(0);
          setPatentStatus(null);
        }
      } finally {
        if (active) {
          setPatentLoading(false);
        }
      }
    };

    fetchPatentCount();

    return () => {
      active = false;
    };
  }, [material.name_ko, material.name]);

  // 한글명: name_ko 우선, 없으면 name
  const displayName = material.name_ko || material.name || '이름 없음';
  // 학명: scientific_name 우선, 없으면 species, 없으면 display_species (HTML 엔티티 디코딩 적용)
  const rawScientific = material.scientific_name || material.species || material.display_species || null;
  const displayScientific = decodeHtmlEntities(rawScientific);
  // 소재 출처
  const sourceLabel = getSourceLabel(material.data_source);
  // 유사도 퍼센트
  const simPct = getSimilarityPercent(material.similarity);
  const bioTags = (() => {
    // 1순위: bioactivity[0] 사용
    if (
      material.bioactivity &&
      Array.isArray(material.bioactivity) &&
      material.bioactivity.length > 0 &&
      typeof material.bioactivity[0] === 'string'
    ) {
      return (material.bioactivity[0] as string)
        .split(',')
        .map((t: string) => t.trim().replace(/\s*등$/, '').trim())
        .filter((t: string) =>
          t.length > 1 &&
          !t.includes(':') &&
          !t.includes('(')
        );
    }

    // 2순위: usage_method 에서 "■ 키워드" 추출 (효능 키워드 화이트리스트 적용)
    const um = (material as any).usage_method;
    if (um && typeof um === 'string') {
      const EFFECT_KEYWORDS = [
        '항산화', '항균', '항염', '항암', '항바이러스',
        '미백', '보습', '주름', '탄력', '진정',
        '항노화', '항알레르기', '항진균', '살균',
        '면역', '혈당', '혈압', '콜레스테롤',
        '소염', '진통', '해열', '이뇨', '강장',
      ];

      return um
        .split('■')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0)
        .map((s: string) => s.split(/[\s(,]/)[0].trim())
        .filter((t: string) => {
          if (t.length <= 1 || t.includes(':') || t.match(/^\d/)) {
            return false;
          }
          // 화이트리스트 키워드가 추출 단어에 포함되거나 일치하는지 확인
          return EFFECT_KEYWORDS.some(kw => t.includes(kw));
        })
        .slice(0, 6);
    }

    return [];
  })();

  // 성분 수
  const compoundCount = Array.isArray(material.compounds) ? material.compounds.length : 0;

  return (
    <div
      onClick={onClick}
      className={`group relative bg-white border rounded-2xl p-5 flex flex-col gap-3.5 hover:shadow-md hover:shadow-[#2D5016]/5 transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'border-[#2D5016] ring-1 ring-[#2D5016] bg-[#2D5016]/[0.02]'
          : 'border-stone-200 hover:border-[#2D5016]'
      }`}
    >

      {/* 상단 줄: 출처 배지 + 특허 배지 + 순위 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {sourceLabel && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sourceLabel.color}`}>
              {sourceLabel.label}
            </span>
          )}
          {material.similarity !== undefined && (
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
              유사도 {simPct}%
            </span>
          )}
          {/* 출처 기관 */}
          {material.source_org && (
            <span className="flex items-center gap-0.5 text-[10px] text-stone-400 font-medium">
              <Building2 className="w-2.5 h-2.5" />
              {material.source_org}
            </span>
          )}
        </div>

        {/* 특허 배지 영역 (실시간 KIPRIS 연동) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {patentStatus !== 'unavailable' && (
            patentLoading ? (
              <span className="text-[10px] font-semibold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full whitespace-nowrap animate-pulse">
                특허 조회중...
              </span>
            ) : patentCount !== null && patentCount > 0 ? (
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full whitespace-nowrap">
                특허 {patentCount}건
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-stone-400 bg-stone-100 border border-stone-200/50 px-2 py-0.5 rounded-full whitespace-nowrap">
                특허 없음
              </span>
            )
          )}
          {/* 북마크 버튼 */}
          <button
            onClick={async (e) => {
              e.stopPropagation();
              const nextState = !bookmarked;
              setBookmarked(nextState);
              try {
                const res = await toggleBookmark(material.id, displayName);
                if (!res.success) {
                  setBookmarked(!nextState); // rollback
                  alert(`⚠️ 북마크 처리에 실패했습니다: ${res.error}`);
                }
              } catch (err) {
                console.error('북마크 연동 실패:', err);
                setBookmarked(!nextState); // rollback
                alert('⚠️ 북마크 처리 중 서버 오류가 발생했습니다.');
              }
            }}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${bookmarked ? 'text-[#2D5016] bg-[#2D5016]/10' : 'text-stone-300 hover:text-stone-500 hover:bg-stone-100'}`}
            title="북마크"
          >
            <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-[#2D5016]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 한글명 + 학명 */}
      <div className="space-y-0.5">
        <h3 className="font-bold text-base text-stone-900 leading-tight group-hover:text-[#2D5016] transition-colors">
          {displayName}
        </h3>
        {/* 효능 태그 - 직접 계산 */}
        {(() => {
          const m = material as any;
          let raw = '';
          if (Array.isArray(m.bioactivity) && m.bioactivity[0]) {
            raw = String(m.bioactivity[0]);
          } else if (m.display_bioactivity) {
            raw = String(m.display_bioactivity);
          } else if (m.usage_method) {
            const kws = ['항산화','항균','항염','항암','미백','보습','주름','진정','항노화','살균','면역','소염','진통','강장','이뇨'];
            raw = m.usage_method
              .split('■')
              .map((s: string) => s.trim().split(/[\s(,]/)[0].trim())
              .filter((t: string) => kws.some((k: string) => t.startsWith(k)))
              .join(',');
          }
          if (!raw) return null;
          const tags = raw
            .split(',')
            .map((t: string) => t.trim().replace(/\s*등$/, ''))
            .filter((t: string) =>
              t.length > 1 &&
              !t.includes(':') &&
              !t.includes('(') &&
              !t.includes('■') &&
              !t.match(/^[A-Z]/) &&
              !['Residue','Fraction','Extract',
                'EtOH','MeOH','Hexane','EA',
                'BuOH','Water'].includes(t)
            )
            .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
            .slice(0, 6);
          if (tags.length === 0) return null;
          return (
            <div style={{display:'flex',flexWrap:'wrap',gap:'4px',marginTop:'8px'}}>
              {tags.map((tag: string) => (
                <span key={tag} style={{fontSize:'11px',padding:'2px 8px',borderRadius:'100px',background:'#E0F5E8',color:'#1B4D32',border:'1px solid #C8DDD2'}}>
                  {tag}
                </span>
              ))}
            </div>
          );
        })()}
        {displayScientific && (
          <p className="text-xs text-stone-400 font-mono leading-relaxed truncate" title={displayScientific}>
            {displayScientific}
          </p>
        )}
      </div>

      {/* 구분선 */}
      <div className="border-t border-stone-100" />

      {/* 하단: 성분 수 + 유사도 바 */}
      <div className="flex items-center justify-between gap-3">
        {/* 성분 수 */}
        <div className="flex items-center gap-1 text-xs text-stone-500 font-medium">
          <FlaskConical className="w-3.5 h-3.5 text-stone-400" />
          <span>
            {compoundCount > 0 ? `성분 ${compoundCount}개` : '성분 정보 없음'}
          </span>
        </div>

        {/* 유사도 점수 바 */}
        <div className="flex items-center gap-2 flex-1 max-w-[140px]">
          <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#2D5016] to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${simPct}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-stone-400 tabular-nums w-7 text-right">
            {simPct}%
          </span>
        </div>
      </div>
    </div>
  );
}
