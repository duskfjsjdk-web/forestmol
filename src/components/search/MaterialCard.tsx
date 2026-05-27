'use client';

import React, { useState, useEffect } from 'react';
import { Bookmark, FlaskConical, Building2 } from 'lucide-react';
import { toggleBookmark, checkBookmarked } from '@/app/actions/bookmark';

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

// bioactivity 배열에서 태그용 칩 목록 추출 (최대 4개)
function getBioactivityTags(material: Material): string[] {
  if (material.bioactivity && Array.isArray(material.bioactivity) && material.bioactivity.length > 0) {
    // 짧은 태그만 필터링 (30자 이하), 최대 4개
    return material.bioactivity
      .filter(tag => typeof tag === 'string' && tag.length <= 30 && tag.length > 0)
      .slice(0, 4);
  }
  return [];
}

export function MaterialCard({ material, onClick, isSelected = false }: MaterialCardProps) {
  const [bookmarked, setBookmarked] = useState(false);
  const [patentCount, setPatentCount] = useState<number | null>(null);
  const [patentLoading, setPatentLoading] = useState(true);

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
          setPatentCount(data.totalCount ?? 0);
        }
      } catch (err) {
        console.error('특허 조회 에러:', err);
        if (active) {
          setPatentCount(0);
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
  // 학명: scientific_name 우선, 없으면 species, 없으면 display_species
  const displayScientific = material.scientific_name || material.species || material.display_species || null;
  // 소재 출처
  const sourceLabel = getSourceLabel(material.data_source);
  // 유사도 퍼센트
  const simPct = getSimilarityPercent(material.similarity);
  // 효능 태그
  const tags = getBioactivityTags(material);
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
          {/* 데이터 출처 배지 */}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sourceLabel.color}`}>
            {sourceLabel.label}
          </span>
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
          {patentLoading ? (
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
        {displayScientific && (
          <p className="text-xs text-stone-400 font-mono leading-relaxed truncate" title={displayScientific}>
            {displayScientific}
          </p>
        )}
      </div>

      {/* 효능 태그 */}
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="text-[10px] font-semibold bg-[#2D5016]/8 text-[#2D5016] border border-[#2D5016]/15 px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : (
        // bioactivity가 긴 텍스트인 경우 (약용소재)
        material.display_bioactivity && material.display_bioactivity !== '정보 없음' && (
          <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">
            {material.display_bioactivity}
          </p>
        )
      )}

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
