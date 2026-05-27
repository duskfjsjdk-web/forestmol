'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Search, Clock, X, ChevronRight, Loader2, AlertCircle, Leaf } from 'lucide-react';
import { MaterialCard, type Material } from '@/components/search/MaterialCard';
import { MaterialSlideOver } from '@/components/search/MaterialSlideOver';
import { useSearchParams } from 'next/navigation';

// ─────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────

// 예시 힌트 칩 (클릭 시 검색창에 자동 입력)
const HINT_CHIPS = [
  '항산화 침엽수 소재',
  '피부 미백 자생식물',
  '항균 산림 추출물',
  '보습 강화 소재',
  '두피 케어 식물',
];

// 필터 탭 목록
const FILTERS = [
  { id: 'all', label: '전체' },
  { id: '식물정유은행', label: '식물정유은행' },
  { id: '산림약용소재', label: '산림약용소재' },
  { id: '바이오소재', label: '바이오소재' },
];

const HISTORY_KEY = 'forestmol_search_history';
const MAX_HISTORY = 10;

// ─────────────────────────────────────────────
// 히스토리 유틸
// ─────────────────────────────────────────────
function loadHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHistory(query: string) {
  if (typeof window === 'undefined') return;
  try {
    const prev = loadHistory().filter(h => h !== query);
    localStorage.setItem(HISTORY_KEY, JSON.stringify([query, ...prev].slice(0, MAX_HISTORY)));
  } catch {}
}

function clearHistoryItem(query: string) {
  if (typeof window === 'undefined') return;
  try {
    const prev = loadHistory().filter(h => h !== query);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(prev));
  } catch {}
}

// ─────────────────────────────────────────────
// 스켈레톤 카드
// ─────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5 flex flex-col gap-3.5 animate-pulse">
      <div className="flex justify-between">
        <div className="h-4 bg-stone-100 rounded-full w-24" />
        <div className="h-4 bg-stone-100 rounded-full w-16" />
      </div>
      <div className="space-y-2">
        <div className="h-5 bg-stone-100 rounded w-3/4" />
        <div className="h-3 bg-stone-100 rounded w-1/2" />
      </div>
      <div className="flex gap-1.5">
        <div className="h-4 bg-stone-100 rounded-full w-16" />
        <div className="h-4 bg-stone-100 rounded-full w-20" />
        <div className="h-4 bg-stone-100 rounded-full w-14" />
      </div>
      <div className="border-t border-stone-100 pt-3 flex justify-between">
        <div className="h-3 bg-stone-100 rounded w-16" />
        <div className="h-3 bg-stone-100 rounded w-24" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 필터 적용 함수
// ─────────────────────────────────────────────
function applyFilter(materials: Material[], filterId: string): Material[] {
  if (filterId === 'all') return materials;
  return materials.filter(m => {
    const ds = m.data_source || '';
    if (filterId === '식물정유은행') return ds.includes('정유');
    if (filterId === '산림약용소재') return ds.includes('약용') || ds.includes('약용식물');
    if (filterId === '바이오소재') return ds.includes('바이오소재');
    return true;
  });
}

// ─────────────────────────────────────────────
// 메인 페이지 컴포넌트
// ─────────────────────────────────────────────
function SearchContent() {
  const searchParams = useSearchParams();
  const queryParam = searchParams ? searchParams.get('query') || '' : '';
  const materialIdParam = searchParams ? searchParams.get('materialId') || '' : '';

  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Material[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [history, setHistory] = useState<string[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 히스토리 로드
  useEffect(() => {
    setHistory(loadHistory());
  }, []);



  // 검색 실행
  const handleSearch = useCallback(async (searchQuery: string) => {
    const q = searchQuery.trim();
    if (!q) return;

    setSubmittedQuery(q);
    setLoading(true);
    setResults(null);
    setError(null);
    setActiveFilter('all');

    const start = Date.now();

    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(q)}`);
      const data = await res.json();

      setElapsedMs(Date.now() - start);

      if (!res.ok) {
        setError(data.error || '검색 중 오류가 발생했습니다.');
        return;
      }

      setResults(data.results || []);
      // 히스토리 저장 및 상태 갱신
      saveHistory(q);
      setHistory(loadHistory());
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.';
      setError(errMsg);
      setElapsedMs(Date.now() - start);
    } finally {
      setLoading(false);
    }
  }, []);

  // 1. 최초 로드 및 쿼리 파라미터 변경 시 자동 검색
  useEffect(() => {
    if (queryParam) {
      setQuery(queryParam);
      handleSearch(queryParam);
    }
  }, [queryParam, handleSearch]);

  // 2. 검색 결과 갱신 시 특정 소재 자동 상세 팝업
  useEffect(() => {
    if (results && materialIdParam) {
      const match = results.find(m => String(m.id) === String(materialIdParam));
      if (match) {
        setSelectedMaterial(match);
        setIsSlideOverOpen(true);
      }
    }
  }, [results, materialIdParam]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleChipClick = (chip: string) => {
    setQuery(chip);
    handleSearch(chip);
  };

  const handleHistoryClick = (h: string) => {
    setQuery(h);
    handleSearch(h);
  };

  const handleDeleteHistory = (e: React.MouseEvent, h: string) => {
    e.stopPropagation();
    clearHistoryItem(h);
    setHistory(loadHistory());
  };

  // 필터 적용된 결과
  const filteredResults = results ? applyFilter(results, activeFilter) : null;

  // ─── 검색 홈 (결과 없음 상태) ───
  const showHome = !loading && results === null;
  const recentHistory = history.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#FAF7F0] font-sans">

      {/* 헤더 바 (결과 화면에서만 활성화) */}
      {!showHome && (
        <div className="sticky top-0 z-10 bg-[#FAF7F0]/90 backdrop-blur-md border-b border-stone-200/80 px-10 py-4">
          <form onSubmit={handleSubmit} className="flex items-center gap-3 max-w-3xl">
            {/* 검색창 */}
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400 group-focus-within:text-[#2D5016] transition-colors">
                <Search className="w-5 h-5" />
              </div>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder='예: 항산화 효능 침엽수 소재'
                className="w-full pl-11 pr-4 py-3 bg-white border border-stone-200 rounded-2xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/20 focus:border-[#2D5016] transition-all shadow-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="flex items-center gap-2 px-5 py-3 bg-[#2D5016] hover:bg-[#203a10] disabled:bg-stone-300 text-white font-semibold text-sm rounded-2xl transition-all shadow-md shadow-[#2D5016]/10 whitespace-nowrap"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              탐색
            </button>
          </form>
        </div>
      )}

      {/* ─── 검색 홈 화면 ─── */}
      {showHome && (
        <div className="flex flex-col items-center justify-center px-6 py-20 max-w-2xl mx-auto">

          {/* 로고/타이틀 */}
          <div className="w-16 h-16 rounded-2xl bg-[#2D5016]/10 flex items-center justify-center text-[#2D5016] mb-6">
            <Leaf className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-stone-900 mb-2 text-center">AI 소재 탐색</h1>
          <p className="text-sm text-stone-500 font-medium text-center mb-8 leading-relaxed">
            산림 공공데이터 7종 기반 pgvector 의미론적 검색으로<br />
            화장품 소재 후보를 즉시 탐색합니다.
          </p>

          {/* 중앙 검색창 */}
          <form onSubmit={handleSubmit} className="flex items-center gap-3 w-full max-w-[640px] mb-10">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400 group-focus-within:text-[#2D5016] transition-colors">
                <Search className="w-5 h-5" />
              </div>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder='예: 항산화 효능 침엽수 소재'
                className="w-full pl-11 pr-4 py-3 bg-white border border-stone-200 rounded-2xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/20 focus:border-[#2D5016] transition-all shadow-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="flex items-center gap-2 px-5 py-3 bg-[#2D5016] hover:bg-[#203a10] disabled:bg-stone-300 text-white font-semibold text-sm rounded-2xl transition-all shadow-md shadow-[#2D5016]/10 whitespace-nowrap"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              탐색
            </button>
          </form>

          {/* 힌트 칩 */}
          <div className="w-full mb-8">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3 text-center">검색 예시</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {HINT_CHIPS.map(chip => (
                <button
                  key={chip}
                  onClick={() => handleChipClick(chip)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-stone-200 hover:border-[#2D5016]/40 hover:bg-[#2D5016]/5 text-sm font-medium text-stone-600 hover:text-[#2D5016] transition-all shadow-sm"
                >
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* 최근 탐색 히스토리 */}
          {recentHistory.length > 0 && (
            <div className="w-full">
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                최근 탐색
              </p>
              <div className="flex flex-col gap-1.5">
                {recentHistory.map(h => (
                  <button
                    key={h}
                    onClick={() => handleHistoryClick(h)}
                    className="group flex items-center justify-between w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl hover:border-[#2D5016]/30 hover:bg-[#2D5016]/5 transition-all text-sm text-stone-600 hover:text-[#2D5016] font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-stone-300 group-hover:text-[#2D5016]/50" />
                      {h}
                    </span>
                    <span
                      role="button"
                      onClick={e => handleDeleteHistory(e, h)}
                      className="text-stone-300 hover:text-stone-500 transition-colors p-1 rounded-md hover:bg-stone-100"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── 로딩: 스켈레톤 UI ─── */}
      {loading && (
        <div className="px-10 py-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Loader2 className="w-4 h-4 text-[#2D5016] animate-spin" />
            <span className="text-sm font-semibold text-stone-500">
              <span className="text-[#2D5016] font-bold">&quot;{submittedQuery}&quot;</span> 탐색 중...
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      )}

      {/* ─── 에러 ─── */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-stone-800 mb-1">검색 오류</h2>
          <p className="text-sm text-stone-500 max-w-sm">{error}</p>
        </div>
      )}

      {/* ─── 검색 결과 ─── */}
      {!loading && results !== null && !error && (
        <div className="px-10 py-8 max-w-7xl mx-auto">

          {/* 결과 헤더 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg font-extrabold text-stone-900">
                <span className="text-[#2D5016]">&quot;{submittedQuery}&quot;</span> 탐색 결과
              </h2>
              <p className="text-xs text-stone-400 font-medium mt-0.5">
                총 {results.length}건 · {elapsedMs !== null ? `${(elapsedMs / 1000).toFixed(2)}초` : ''}
              </p>
            </div>

            {/* 필터 탭 */}
            <div className="flex gap-1.5 flex-wrap">
              {FILTERS.map(f => {
                const count = applyFilter(results, f.id).length;
                return (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                      activeFilter === f.id
                        ? 'bg-[#2D5016] text-white shadow-sm'
                        : 'bg-white border border-stone-200 text-stone-500 hover:border-[#2D5016]/30 hover:text-[#2D5016]'
                    }`}
                  >
                    {f.label}
                    <span className={`ml-1 ${activeFilter === f.id ? 'opacity-70' : 'opacity-50'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 결과 없음 */}
          {filteredResults && filteredResults.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
                <Search className="w-7 h-7 text-stone-400" />
              </div>
              <h3 className="font-bold text-stone-700 mb-1">결과가 없습니다</h3>
              <p className="text-sm text-stone-400 mb-5">
                {activeFilter !== 'all' ? '다른 필터를 선택하거나 ' : ''}다른 키워드로 검색해보세요.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {HINT_CHIPS.slice(0, 3).map(chip => (
                  <button
                    key={chip}
                    onClick={() => handleChipClick(chip)}
                    className="px-3 py-1.5 rounded-full bg-white border border-stone-200 hover:border-[#2D5016]/30 text-xs font-medium text-stone-600 hover:text-[#2D5016] transition-all"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 카드 그리드 */}
          {filteredResults && filteredResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredResults.map((material, idx) => (
                <MaterialCard
                  key={material.id || idx}
                  material={material}
                  isSelected={selectedMaterial?.id === material.id && isSlideOverOpen}
                  onClick={() => {
                    setSelectedMaterial(material);
                    setIsSlideOverOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 상세 정보 슬라이드오버 */}
      <MaterialSlideOver
        material={selectedMaterial}
        isOpen={isSlideOverOpen}
        onClose={() => setIsSlideOverOpen(false)}
      />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAF7F0] flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 text-[#2D5016] animate-spin mb-3" />
        <span className="text-xs font-bold text-stone-400">소재 탐색 페이지를 불러오는 중...</span>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
