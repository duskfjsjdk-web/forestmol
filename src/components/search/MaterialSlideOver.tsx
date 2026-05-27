'use client';

import React, { useEffect, useState } from 'react';
import { X, Bookmark, FlaskConical, Building2, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Clock, FileText, Loader2, FolderPlus, Plus } from 'lucide-react';
import { type Material } from './MaterialCard';
import { toggleBookmark, checkBookmarked } from '@/app/actions/bookmark';
import { getProjects, createProject, addMaterialToProject } from '@/app/actions/project';

interface MaterialSlideOverProps {
  material: Material | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MaterialSlideOver({ material, isOpen, onClose }: MaterialSlideOverProps) {
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [patentCount, setPatentCount] = useState<number | null>(null);
  const [patentLoading, setPatentLoading] = useState(true);
  const [showAllCompounds, setShowAllCompounds] = useState(false);
  const [showAllPathways, setShowAllPathways] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showRawBio, setShowRawBio] = useState(false);

  // 프로젝트 기능용 상태
  const [projects, setProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectClient, setNewProjectClient] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // ESC 키 클릭 시 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !showModal) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showModal]);

  // 소재 데이터가 바뀔 때 상태 초기화 및 조회 수행
  useEffect(() => {
    if (!material) return;

    // 상태 초기화
    setPatentCount(null);
    setPatentLoading(true);
    setShowAllCompounds(false);
    setShowAllPathways(false);
    setShowDropdown(false);
    setShowModal(false);
    setShowRawBio(false);

    let active = true;

    // 1. 북마크 상태 조회
    const checkBookmarkStatus = async () => {
      const isBookmarked = await checkBookmarked(material.id);
      if (active) {
        setBookmarked(isBookmarked);
      }
    };

    // 2. 특허 개수 조회
    const fetchPatent = async () => {
      const searchQuery = material.name_ko || material.name;
      if (!searchQuery) {
        setPatentCount(0);
        setPatentLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/patent?query=${encodeURIComponent(searchQuery)}`);
        if (!res.ok) throw new Error('조회 실패');
        const data = await res.json();
        if (active) {
          setPatentCount(data.totalCount ?? 0);
        }
      } catch (err) {
        console.error('슬라이드오버 특허 조회 실패:', err);
        if (active) {
          setPatentCount(0);
        }
      } finally {
        if (active) {
          setPatentLoading(false);
        }
      }
    };

    checkBookmarkStatus();
    fetchPatent();

    return () => {
      active = false;
    };
  }, [material]);

  if (!material) return null;

  const displayName = material.name_ko || material.name || '이름 없음';
  const displayScientific = material.scientific_name || material.species || material.display_species || null;

  // 1. 생리활성 효능 가공 및 태그 추출
  const rawBio = material.display_bioactivity || '';
  const extractedTags: string[] = [];

  if (rawBio) {
    // '■' 기호를 기준으로 분리
    const parts = rawBio.split('■');
    parts.forEach(part => {
      const trimmed = part.trim();
      if (!trimmed) return;

      // 괄호 ( 이후 및 대시 -, 쉼표 , 혹은 공백 등으로 단어를 분리
      const words = trimmed.split(/[,\s\(\)\-]+/);
      words.forEach(word => {
        const w = word.trim();
        // 효능을 의미하는 핵심 단어 검출
        if (/^(항균|항산화|항염|미백|보습|진정|탄력|주름|항암|항알레르기|항바이러스|아토피|면역)/.test(w)) {
          const match = w.match(/^(항균|항산화|항염|미백|보습|진정|탄력|주름|항암|항알레르기|항바이러스|아토피|면역)/);
          if (match && match[0]) {
            extractedTags.push(match[0]);
          }
        }
      });
    });
  }

  // 매칭된 태그가 없으면 기본으로 각 파트의 첫 단어를 폴백으로 추출
  if (extractedTags.length === 0 && rawBio) {
    const parts = rawBio.split('■');
    parts.forEach(part => {
      const trimmed = part.trim();
      if (!trimmed) return;
      const firstWord = trimmed.split(/[,\s\(\)\-]+/)[0]?.trim();
      if (firstWord && firstWord.length < 15) {
        extractedTags.push(firstWord);
      }
    });
  }

  // 중복 태그 제거
  const bioactivityTags = Array.from(new Set(extractedTags));

  const compounds = material.compounds || [];
  const displayCompounds = showAllCompounds ? compounds : compounds.slice(0, 10);
  const hasMoreCompounds = compounds.length > 10;

  const todayString = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  // 북마크 토글 클릭
  const handleBookmarkToggle = async () => {
    if (bookmarkLoading) return;
    setBookmarkLoading(true);
    const res = await toggleBookmark(material.id, displayName);
    setBookmarkLoading(false);

    if (res.success) {
      setBookmarked(res.bookmarked);
      if (res.bookmarked) {
        alert(`🔖 [${displayName}] 소재가 개인 북마크 저장소에 저장됐습니다.`);
      } else {
        alert(`ℹ️ [${displayName}] 소재 북마크 저장이 취소되었습니다.`);
      }
    } else {
      alert(`⚠️ 오류: ${res.error || '북마크 처리에 실패했습니다.'}`);
    }
  };

  // 프로젝트 목록 불러오기 및 드롭다운 토글
  const handleDropdownToggle = async () => {
    if (!showDropdown) {
      setProjectsLoading(true);
      const list = await getProjects();
      setProjects(list);
      setProjectsLoading(false);
    }
    setShowDropdown(!showDropdown);
  };

  // 기존 프로젝트에 소재 추가
  const handleAddToProject = async (projectId: string, projectName: string) => {
    const res = await addMaterialToProject(projectId, material.id, displayName);
    setShowDropdown(false);
    if (res.success) {
      alert(`📁 [${projectName}] 프로젝트에 추가됐습니다.`);
    } else {
      alert(`⚠️ 오류: ${res.error || '프로젝트 추가에 실패했습니다.'}`);
    }
  };

  // 신규 프로젝트 생성 및 즉각 추가
  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !newProjectClient.trim()) return;

    setCreateLoading(true);
    const res = await createProject(newProjectName.trim(), newProjectClient.trim());
    
    if (res.success && res.project) {
      // 프로젝트 생성 성공 시 즉각 소재를 해당 프로젝트에 담습니다.
      const addRes = await addMaterialToProject(res.project.id, material.id, displayName);
      setCreateLoading(false);
      setShowModal(false);
      setNewProjectName('');
      setNewProjectClient('');
      
      if (addRes.success) {
        alert(`✨ 새 프로젝트 [${res.project.name}]이 생성되었고 소재가 추가됐습니다.`);
      } else {
        alert(`✨ 새 프로젝트가 생성되었으나 소재 추가에는 실패했습니다: ${addRes.error}`);
      }
    } else {
      setCreateLoading(false);
      alert(`❌ 프로젝트 생성에 실패했습니다: ${res.error}`);
    }
  };

  return (
    <>
      {/* 1. 뒷배경 어둡게 처리 (Backdrop) */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-[#1A1710]/40 backdrop-blur-[2px] z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* 2. 우측 슬라이드 서랍장 패널 */}
      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-[460px] bg-white border-l border-stone-200 shadow-2xl z-50 flex flex-col justify-between transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* 헤더 영역 */}
        <div className="p-6 border-b border-stone-100 bg-[#FAF7F0]/40 shrink-0">
          <div className="flex justify-between items-start mb-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                {material.data_source || '천연 소재'}
              </span>
              {material.source_org && (
                <span className="flex items-center gap-0.5 text-[10px] text-stone-400 font-medium">
                  <Building2 className="w-2.5 h-2.5" />
                  {material.source_org}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              title="닫기 (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-stone-900 leading-tight">
              {displayName}
            </h2>
            {displayScientific && (
              <p className="text-xs text-stone-400 font-mono tracking-tight font-medium">
                {displayScientific}
              </p>
            )}
          </div>
        </div>

        {/* 본문 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* 1. 주요 효능 */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-stone-300" />
              주요 생리활성 효능
            </h3>
            {bioactivityTags.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {bioactivityTags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-xs font-semibold bg-[#2D5016]/8 text-[#2D5016] border border-[#2D5016]/15 px-2.5 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {rawBio && (
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => setShowRawBio(!showRawBio)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-400 hover:text-[#2D5016] transition-colors"
                    >
                      <span>{showRawBio ? '상세 정보 접기' : '상세 정보 보기'}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showRawBio ? 'rotate-180' : ''}`} />
                    </button>
                    {showRawBio && (
                      <p className="text-[11px] text-stone-500 leading-relaxed bg-stone-50 border border-stone-150 rounded-xl p-3 mt-1.5 whitespace-pre-line">
                        {rawBio}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : rawBio && rawBio !== '정보 없음' ? (
              <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 border border-stone-100 rounded-xl p-3.5">
                {rawBio}
              </p>
            ) : (
              <p className="text-xs text-stone-400 italic">효능 정보 없음</p>
            )}
          </section>

          {/* 2. 성분 목록 */}
          <section className="space-y-2.5">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5 text-stone-300" />
                함유 화학 성분 목록
              </h3>
              <span className="text-[10px] font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">
                전체 {compounds.length}개
              </span>
            </div>

            {compounds.length > 0 ? (
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-1.5">
                  {displayCompounds.map((c, i) => (
                    <div
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-stone-200 hover:border-stone-300 rounded-lg text-xs font-medium text-stone-700 transition-colors shadow-sm"
                    >
                      <span>{c.name}</span>
                      {c.cas && (
                        <span className="text-[10px] text-stone-400 font-mono font-normal">
                          (CAS {c.cas})
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {hasMoreCompounds && (
                  <button
                    onClick={() => setShowAllCompounds(v => !v)}
                    className="w-full mt-2 py-2 px-3 border border-stone-200 hover:border-[#2D5016]/40 hover:bg-[#2D5016]/5 text-xs text-[#2D5016] font-semibold rounded-xl flex items-center justify-center gap-1 transition-all"
                  >
                    {showAllCompounds ? (
                      <>
                        접기 <ChevronUp className="w-3 h-3" />
                      </>
                    ) : (
                      <>
                        전체 {compounds.length}개 모두 보기 <ChevronDown className="w-3 h-3" />
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-stone-400 italic">함유 성분 정보가 데이터베이스에 존재하지 않습니다.</p>
            )}
          </section>

          {/* 2.5. KEGG 데이터 섹션 (성분 목록 바로 아래) */}
          {((material.kegg_pathways && material.kegg_pathways.length > 0) || (material.kegg_enzymes && material.kegg_enzymes.length > 0)) && (
            <div className="space-y-5 border-t border-stone-100 pt-5">
              {/* 대사 경로 섹션 */}
              {material.kegg_pathways && material.kegg_pathways.length > 0 && (
                <section className="space-y-2.5">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                    🔬 대사 경로
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(showAllPathways ? material.kegg_pathways : material.kegg_pathways.slice(0, 5)).map((path, idx) => (
                      <a
                        key={idx}
                        href={`https://www.genome.jp/pathway/${path.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/50 text-xs font-semibold text-emerald-850 transition-all shadow-sm cursor-pointer hover:-translate-y-0.5"
                      >
                        {path.name}
                      </a>
                    ))}
                  </div>
                  {material.kegg_pathways.length > 5 && (
                    <button
                      onClick={() => setShowAllPathways(!showAllPathways)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2D5016] hover:underline"
                    >
                      {showAllPathways ? '접기' : `외 ${material.kegg_pathways.length - 5}개 보기`}
                    </button>
                  )}
                  <div className="text-[9px] text-stone-400 font-medium">
                    출처: KEGG Database
                  </div>
                </section>
              )}

              {/* 관련 효소 섹션 */}
              {material.kegg_enzymes && material.kegg_enzymes.length > 0 && (
                <section className="space-y-2.5">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                    ⚗ 관련 효소
                  </h3>
                  <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden divide-y divide-stone-100 shadow-sm">
                    {material.kegg_enzymes.slice(0, 5).map((enzyme, idx) => (
                      <div
                        key={idx}
                        className="px-3.5 py-2.5 flex justify-between items-center text-xs text-stone-700 font-medium"
                      >
                        <span className="truncate pr-2" title={enzyme.name}>{enzyme.name}</span>
                        <span className="text-[9px] text-stone-400 font-mono shrink-0">
                          EC {enzyme.id}
                        </span>
                      </div>
                    ))}
                    {material.kegg_enzymes.length > 5 && (
                      <div className="px-3.5 py-2 bg-stone-50/50 text-[9px] text-stone-400 text-center font-semibold border-t border-stone-100">
                        외 {material.kegg_enzymes.length - 5}개
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* 3. 특허 선행조사 */}
          <section className="space-y-2.5 bg-[#FAF7F0]/60 border border-stone-200/60 rounded-2xl p-4.5">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">
              국내 특허 선행조사 결과
            </h3>
            
            {patentLoading ? (
              <div className="flex items-center gap-2 text-stone-400 text-xs py-1 animate-pulse">
                <Clock className="w-4 h-4 animate-spin text-[#2D5016]" />
                <span>특허청 KIPRIS 실시간 조회 중...</span>
              </div>
            ) : patentCount !== null && patentCount > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-700 font-bold text-sm bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2">
                  <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
                  <span>KR: ✕ 특허 존재 ({patentCount}건 검출)</span>
                </div>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  출원 및 등록된 특허가 검색되었습니다. 제품 상용화 계획 수립 시 특허 침해 요소를 면밀히 분석할 것을 권장합니다.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-2">
                  <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
                  <span>KR: ✓ 안전 (동일명 특허 없음)</span>
                </div>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  특허청 데이터베이스에서 해당 소재 단독 명칭으로 출원된 특허를 찾지 못했습니다. 기술 경쟁력 확보가 유리할 수 있습니다.
                </p>
              </div>
            )}

            <div className="border-t border-stone-200/50 pt-2 flex justify-between text-[10px] text-stone-400">
              <span>조회 기준일: {todayString}</span>
              <span>출처: 특허정보원 (KIPRIS)</span>
            </div>

            <p className="text-[9px] text-stone-400/80 leading-normal mt-1 border-t border-stone-200/40 pt-1.5">
              ※ 본 특허 검증은 국내 특허청 공개정보를 활용한 단순 키워드 선행조사이며, 법적 효력을 가지지 않으므로 최종 상용화 검토는 전문 변리사의 진단이 필요합니다.
            </p>
          </section>

          {/* 4. 데이터 출처 정보 */}
          <section className="space-y-2 text-[11px] text-stone-500 bg-stone-50/50 border border-stone-150 rounded-xl p-3.5 font-medium">
            <p className="flex items-center gap-1.5">
              <span className="text-stone-400 font-bold">·</span>
              <span className="text-stone-500 font-bold">원본 데이터 제공:</span>
              <span className="text-stone-600">{material.source_org || '산림청 산하 연구센터'}</span>
            </p>
            <p className="flex items-center gap-1.5">
              <span className="text-stone-400 font-bold">·</span>
              <span className="text-stone-500 font-bold">수집 경로:</span>
              <span className="text-stone-600">{material.data_source || '공공 데이터 포털'}</span>
            </p>
            <p className="flex items-center gap-1.5">
              <span className="text-stone-400 font-bold">·</span>
              <span className="text-stone-500 font-bold">데이터 최종 갱신일:</span>
              <span className="text-stone-600">2025.12.31</span>
            </p>
          </section>
        </div>

        {/* 하단 고정 버튼 영역 */}
        <div className="relative p-4 bg-white border-t border-stone-200 flex items-center gap-2 shrink-0">
          
          {/* 북마크 버튼 */}
          <button
            onClick={handleBookmarkToggle}
            disabled={bookmarkLoading}
            className={`w-11 h-11 flex items-center justify-center rounded-xl border transition-all ${
              bookmarked
                ? 'bg-[#2D5016]/10 border-[#2D5016] text-[#2D5016]'
                : 'bg-white border-stone-200 text-stone-400 hover:text-stone-600 hover:border-stone-300'
            }`}
            title="북마크 담기"
          >
            {bookmarkLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Bookmark className={`w-5 h-5 ${bookmarked ? 'fill-[#2D5016]' : ''}`} />
            )}
          </button>

          {/* 프로젝트 추가 버튼 & 드롭다운 콤보 */}
          <div className="flex-1 relative">
            <button
              onClick={handleDropdownToggle}
              className="w-full py-3 px-4 bg-[#2D5016] hover:bg-[#203a10] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#2D5016]/10 flex items-center justify-center gap-1.5"
            >
              <span>+ 프로젝트에 추가</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* 프로젝트 선택 드롭다운 목록 */}
            {showDropdown && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-stone-200 rounded-xl shadow-xl z-[60] max-h-48 overflow-y-auto overflow-x-hidden flex flex-col py-1 transition-all">
                {projectsLoading ? (
                  <div className="flex items-center justify-center py-4 text-xs text-stone-400 gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2D5016]" />
                    <span>불러오는 중...</span>
                  </div>
                ) : projects.length > 0 ? (
                  <div className="flex flex-col divide-y divide-stone-100">
                    {projects.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleAddToProject(p.id, p.name)}
                        className="w-full text-left px-4 py-2.5 text-xs text-stone-700 hover:bg-stone-50 hover:text-[#2D5016] font-medium transition-all truncate"
                      >
                        📁 {p.name} <span className="text-[10px] text-stone-400 font-normal">({p.clientName})</span>
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        setShowModal(true);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-[#2D5016] hover:bg-[#2D5016]/5 font-bold transition-all flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>새 프로젝트 만들기</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      setShowModal(true);
                    }}
                    className="w-full px-4 py-3.5 text-xs text-[#2D5016] hover:bg-[#2D5016]/5 font-bold transition-all flex items-center justify-center gap-1.5 rounded-xl"
                  >
                    <Plus className="w-4 h-4" />
                    <span>첫 프로젝트 만들기</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 역합성 요청 버튼 (비활성화 + 툴팁) */}
          <div
            className="relative shrink-0"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <button
              disabled
              className="h-11 px-3 bg-stone-100 border border-stone-200 text-stone-400 rounded-xl flex items-center gap-1 text-xs cursor-not-allowed"
            >
              <FlaskConical className="w-4 h-4 text-stone-300" />
              <span>⚗ 역합성 요청</span>
            </button>
            {showTooltip && (
              <div className="absolute bottom-full right-0 mb-2 w-20 bg-[#1A1710] text-white text-[10px] py-1.5 px-2 rounded-lg text-center shadow-lg font-medium z-50 whitespace-nowrap">
                준비 중
                <div className="absolute top-full right-6 -mt-1 border-4 border-transparent border-t-[#1A1710]" />
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 3. 새 프로젝트 만들기 입력 모달 팝업 */}
      {showModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* 어두운 배경 */}
          <div onClick={() => setShowModal(false)} className="fixed inset-0 bg-[#1A1710]/60 backdrop-blur-[1px]" />
          
          {/* 모달 폼 */}
          <form onSubmit={handleCreateProjectSubmit} className="relative bg-white rounded-3xl p-7 max-w-md w-full border border-stone-200 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex justify-between items-center">
              <h4 className="text-base font-bold text-stone-900 flex items-center gap-1.5">
                <FolderPlus className="w-5 h-5 text-[#2D5016]" />
                새 프로젝트 만들기
              </h4>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-600 block pl-0.5">프로젝트명</label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="예: 동백 미백 에센스 라인 개발"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#2D5016]/20 focus:border-[#2D5016] focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-600 block pl-0.5">고객사(브랜드)명</label>
                <input
                  type="text"
                  required
                  value={newProjectClient}
                  onChange={e => setNewProjectClient(e.target.value)}
                  placeholder="예: 코스메카코리아, 인디뷰티"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#2D5016]/20 focus:border-[#2D5016] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-all"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="flex-1 py-3 bg-[#2D5016] hover:bg-[#203a10] disabled:bg-stone-300 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-[#2D5016]/10 flex items-center justify-center gap-1.5"
              >
                {createLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>생성 중...</span>
                  </>
                ) : (
                  <span>생성 및 소재 추가</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

