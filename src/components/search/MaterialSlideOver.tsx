'use client';

import React, { useEffect, useState } from 'react';
import { X, Bookmark, FlaskConical, Building2, CheckCircle2, AlertTriangle, CircleHelp, ChevronDown, ChevronUp, Clock, FileText, Loader2, FolderPlus, Plus } from 'lucide-react';
import { type Material } from './MaterialCard';
import { toggleBookmark, checkBookmarked } from '@/app/actions/bookmark';
import { getProjects, createProject, addMaterialToProject } from '@/app/actions/project';
import { parseBioactivityTags, parseBioactivityDetail } from '@/utils/parseBioactivity';
import { createClient } from '@supabase/supabase-js';

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const [patentStatus, setPatentStatus] = useState<string | null>(null);
  const [showAllCompounds, setShowAllCompounds] = useState(false);
  const [showAllPathways, setShowAllPathways] = useState(false);
  const [showAllEnzymes, setShowAllEnzymes] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showRawBio, setShowRawBio] = useState(false);
  const [rawData, setRawData] = useState<any>(null); // raw_data 보조 상태 (RPC 미반환 시 추가 조회)
  const [fetchedDistribution, setFetchedDistribution] = useState<string | null>(null); // distribution 보조 상태
  const [keggInterpretation, setKeggInterpretation] = useState<string | null>(null);
  const [keggLoading, setKeggLoading] = useState(false);
  
  // PubMed 논문 상태
  const [papers, setPapers] = useState<any[]>([]);
  const [papersLoading, setPapersLoading] = useState(false);

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
    setShowAllEnzymes(false);
    setShowAllIngredients(false);
    setShowDropdown(false);
    setShowModal(false);
    setShowRawBio(false);
    setRawData(null); // raw_data 초기화
    setFetchedDistribution(null);
    setKeggInterpretation(null);
    setPapers([]);
    setPapersLoading(false);

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
          if (data.status === 'unavailable') {
            setPatentStatus('unavailable');
          } else {
            setPatentCount(data.totalCount ?? 0);
            setPatentStatus(null);
          }
        }
      } catch (err) {
        console.error('슬라이드오버 특허 조회 실패:', err);
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

    // 3. raw_data / distribution 추가 조회 (RPC 반환값에 없을 때)
    const fetchExtraData = async () => {
      if ((material as any).raw_data !== undefined && (material as any).distribution !== undefined) return; 
      try {
        const { data } = await supabaseClient
          .from('materials')
          .select('raw_data, distribution')
          .eq('id', material.id)
          .single();
        if (active && data) {
          if ((material as any).raw_data === undefined) setRawData(data.raw_data);
          if ((material as any).distribution === undefined) setFetchedDistribution(data.distribution);
        }
      } catch {}
    };

    // 4. KEGG AI 해석 추가 조회
    const fetchKeggAI = async () => {
      if ((material.kegg_pathways && material.kegg_pathways.length > 0) || (material.kegg_enzymes && material.kegg_enzymes.length > 0)) {
        setKeggLoading(true);
        try {
          const res = await fetch('/api/ai/kegg', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: material.name_ko || material.name,
              compounds: material.compounds,
              kegg_pathways: material.kegg_pathways,
              kegg_enzymes: material.kegg_enzymes
            })
          });
          const data = await res.json();
          if (active) setKeggInterpretation(data.interpretation);
        } catch (e) {
          if (active) setKeggInterpretation("효소 처리 실험 설계 참고용으로 활용할 수 있습니다.");
        } finally {
          if (active) setKeggLoading(false);
        }
      }
    };

    // 5. PubMed 논문 목록 조회
    const fetchPubMedPapers = async () => {
      const scientificName = material.scientific_name || material.species || material.display_species || '';
      if (!scientificName) return;

      setPapersLoading(true);
      try {
        // 상위 성분 3개 추출
        const compNames = (material.compounds || [])
          .slice(0, 3)
          .map((c: any) => c.name)
          .join(',');

        const url = `/api/pubmed?scientificName=${encodeURIComponent(scientificName)}&compounds=${encodeURIComponent(compNames)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('PubMed 조회 실패');
        const data = await res.json();
        if (active && data.success) {
          setPapers(data.papers || []);
        }
      } catch (err) {
        console.error('PubMed 논문 조회 실패:', err);
      } finally {
        if (active) {
          setPapersLoading(false);
        }
      }
    };

    checkBookmarkStatus();
    fetchPatent();
    fetchExtraData();
    fetchKeggAI();
    fetchPubMedPapers();

    return () => {
      active = false;
    };
  }, [material]);

  if (!material) return null;

  const displayName = material.name_ko || material.name || '이름 없음';
  const rawScientific = material.scientific_name || material.species || material.display_species || null;
  const displayScientific = rawScientific
    ? rawScientific
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
    : null;

  // 1. 생리활성 효능 가공 및 태그 추출
  const rawBio = (() => {
    const m = material as any;
    if (Array.isArray(m.bioactivity) && m.bioactivity.length > 0) {
      return String(m.bioactivity[0]);
    } else if (m.display_bioactivity) {
      return String(m.display_bioactivity);
    } else if (m.usage_method) {
      return m.usage_method
        .split('■')
        .map((s: string) => s.trim().split(/[\s(,]/)[0].trim())
        .filter((t: string) => t.length > 0)
        .join(',');
    }
    return '';
  })();

  const compoundsList = material.compounds || [];
  const uniqueCompounds = compoundsList.reduce(
    (acc: any[], compound: any) => {
      const key = (compound.cas || compound.cas_no || compound.name || compound.name_ko || '').trim();
      if (key && !acc.some(c => (c.cas || c.cas_no || c.name || c.name_ko || '').trim() === key)) {
        acc.push(compound);
      }
      return acc;
    }, []
  );

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

  uniqueCompounds.sort((a: any, b: any) => {
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

  const displayCompounds = showAllCompounds ? uniqueCompounds : uniqueCompounds.slice(0, 10);
  const hasMoreCompounds = uniqueCompounds.length > 10;

  // raw_data 파싱 → 추출 조건 추출 (prop에 없으면 추가 조회된 rawData 상태 사용)
  const rawDataObj: any = (() => {
    const rd = (material as any).raw_data !== undefined
      ? (material as any).raw_data
      : rawData;
    if (!rd) return {};
    
    let parsed = rd;
    if (typeof rd === 'string') {
      try {
        parsed = JSON.parse(rd);
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      } catch {}
    }
    
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0];
    } else if (Array.isArray(parsed) && parsed.length === 0) {
      return {};
    }
    return parsed;
  })();
  // 데이터 소스별 추출 조건 파싱
  const matDataSource = ((material as any).data_source || '').toLowerCase();
  
  const bioactivityTags = parseBioactivityTags(rawBio);

  let extractionPart: string | null = null;
  let extractionSolvent: string | null = null;
  let extractionMethod: string | null = null;
  let harvestMethod: string | null = null;

  if (matDataSource.includes('바이오소재')) {
    // 산림바이오소재: raw_data 필드에서 파싱
    extractionPart   = rawDataObj['추출부위'] || rawDataObj['부위'] || rawDataObj['채취부위'] || null;
    extractionSolvent = rawDataObj['추출용매'] || rawDataObj['용매'] || null;
    extractionMethod  = rawDataObj['추출방법'] || rawDataObj['추출 방법'] || null;
  } else if (matDataSource.includes('약용식물')) {
    // 산림청_약용식물: bioactivity[1]을 채취 방법으로 표시
    const bioArr = Array.isArray(material.bioactivity) ? material.bioactivity as string[]
      : (material.bioactivity ? [String(material.bioactivity)] : []);
    if (bioArr.length >= 2 && bioArr[1]) {
      harvestMethod = String(bioArr[1]).trim();
    }
  }
  // 식물정유은행: 추출 조건 데이터 없음 → 모두 null 유지

  const hasExtractionInfo = extractionPart || extractionSolvent || extractionMethod || harvestMethod;


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
            {(() => {
              // 자생지 우선순위 파싱
              const rd = rawDataObj;
              const distValue = (material as any).distribution !== undefined ? (material as any).distribution : fetchedDistribution;
              const dist =
                (distValue?.trim()) ||
                rd['약용식물분포설명'] ||
                rd['분포'] ||
                rd['distribution'] ||
                null;
              return dist ? (
                <p className="text-[11px] text-stone-500 flex items-center gap-1 pt-0.5">
                  <span className="text-stone-300">📍</span>
                  {dist}
                </p>
              ) : null;
            })()}
          </div>
        </div>

        {/* 본문 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* 0. 추출 조건 (raw_data 있을 때만 표시) */}
          {hasExtractionInfo && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5 text-stone-300" />
                {harvestMethod ? '채취·추출 정보' : '추출 조건'}
              </h3>
              <div className="bg-stone-50 border border-stone-150 rounded-xl p-3 space-y-1.5">
                {extractionPart && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-16 font-semibold text-stone-500 shrink-0">추출 부위</span>
                    <span className="text-stone-700">{extractionPart}</span>
                  </div>
                )}
                {extractionSolvent && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-16 font-semibold text-stone-500 shrink-0">추출 용매</span>
                    <span className="text-stone-700">{extractionSolvent}</span>
                  </div>
                )}
                {extractionMethod && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-16 font-semibold text-stone-500 shrink-0">추출 방법</span>
                    <span className="text-stone-700">{extractionMethod}</span>
                  </div>
                )}
                {harvestMethod && (
                  <div className="flex items-start gap-2 text-xs">
                    <span className="w-16 font-semibold text-stone-500 shrink-0 pt-0.5">채취 방법</span>
                    <span className="text-stone-700 leading-relaxed">{harvestMethod}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 1. 주요 효능 */}
          {bioactivityTags.length > 0 && (
            <section className="space-y-2.5">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-stone-300" />
                주요 생리활성 효능
              </h3>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {bioactivityTags.slice(0, 8).map((tag, i) => (
                    <span
                      key={i}
                      className="text-xs font-semibold bg-[#2D5016]/8 text-[#2D5016] border border-[#2D5016]/15 px-2.5 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                  {bioactivityTags.length > 8 && (
                    <span className="text-xs font-semibold bg-stone-100 text-stone-500 border border-stone-200 px-2.5 py-1 rounded-full">
                      +{bioactivityTags.length - 8}개
                    </span>
                  )}
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
            </section>
          )}

          {/* 2. 성분 목록 */}
          <section className="space-y-2.5">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5 text-stone-300" />
                함유 화학 성분 목록
              </h3>
              <span className="text-[10px] font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">
                전체 {uniqueCompounds.length}개
              </span>
            </div>

            {uniqueCompounds.length > 0 ? (
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
                        전체 {uniqueCompounds.length}개 모두 보기 <ChevronDown className="w-3 h-3" />
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-stone-400 italic">함유 성분 정보가 데이터베이스에 존재하지 않습니다.</p>
            )}
          </section>

          {/* 3. 화장품 원료 적합성 (식약처 검증) */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-stone-300" />
              화장품 원료 적합성
            </h3>
            {(material as any).cosmetic_allowed === true ? (
              <div className="flex flex-col gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-emerald-800">✓ 식약처 화장품 원료성분 등록 확인</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      식약처 화장품 원료성분 목록에 등록된 원료
                    </p>
                  </div>
                </div>
                {(material as any).cosmetic_matched_ingredients && Array.isArray((material as any).cosmetic_matched_ingredients) && (material as any).cosmetic_matched_ingredients.length > 0 && (
                  <div className="mt-1 bg-white rounded-lg border border-emerald-100 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-emerald-50/50 text-emerald-800 font-semibold border-b border-emerald-100">
                        <tr>
                          <th className="px-3 py-2 border-r border-emerald-100">성분명(한글)</th>
                          <th className="px-3 py-2 border-r border-emerald-100">성분명(영문)</th>
                          <th className="px-3 py-2 whitespace-nowrap">CAS No</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-50">
                        {(material as any).cosmetic_matched_ingredients
                          .slice(0, showAllIngredients ? undefined : 5)
                          .map((ing: any, idx: number) => (
                          <tr key={idx} className="text-emerald-900">
                            <td className="px-3 py-2 font-medium border-r border-emerald-50">{ing.ingr_kor_name || '-'}</td>
                            <td className="px-3 py-2 text-emerald-700 text-[11px] border-r border-emerald-50">{ing.ingr_eng_name || '-'}</td>
                            <td className="px-3 py-2 font-mono text-[10px] text-emerald-600">{ing.cas_no || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(material as any).cosmetic_matched_ingredients.length > 5 && (
                      <button
                        onClick={() => setShowAllIngredients(!showAllIngredients)}
                        className="w-full py-2 bg-emerald-50/30 hover:bg-emerald-50/50 text-xs font-medium text-emerald-700 border-t border-emerald-100 transition-colors flex items-center justify-center gap-1"
                      >
                        {showAllIngredients ? (
                          <>접기 <ChevronUp className="w-3 h-3" /></>
                        ) : (
                          <>외 {(material as any).cosmetic_matched_ingredients.length - 5}개 성분 더 보기 <ChevronDown className="w-3 h-3" /></>
                        )}
                      </button>
                    )}
                    <div className="px-3 py-1.5 bg-emerald-50/30 text-[9px] text-emerald-600/70 border-t border-emerald-100 text-right">
                      출처: 식약처 화장품 원료성분 정보 (data.go.kr)
                    </div>
                  </div>
                )}
              </div>
            ) : (material as any).cosmetic_allowed === false ? (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800">식약처 미등록 (별도 확인 필요)</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    식약처 원료성분 목록에 없음. 사용 금지가 아니며 신규 원료이거나 다른 명칭으로 등록됐을 수 있음.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 bg-stone-50 border border-stone-200 rounded-xl p-3.5">
                <CircleHelp className="w-4.5 h-4.5 text-stone-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-stone-700">성분 정보 없음</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    해당 소재의 화합물(compounds) 성분 정보가 등록되어 있지 않아 적합성을 판별할 수 없습니다.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* 2.5. KEGG 데이터 섹션 (성분 목록 바로 아래) */}
          {((material.kegg_pathways && material.kegg_pathways.length > 0) || (material.kegg_enzymes && material.kegg_enzymes.length > 0)) && (
            <div className="space-y-4 border-t border-stone-100 pt-5">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-[13px] font-bold text-stone-800">
                  효소 처리 가능성 (KEGG)
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#EEEDFE] text-[#3C3489]">생물학 활성 데이터</span>
              </div>
              
              <div className="text-[11.5px] text-stone-700 bg-stone-50 p-3.5 rounded-lg border border-stone-200 leading-relaxed font-medium relative overflow-hidden">
                <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[#6366F1] font-extrabold text-[10px]">✨ AI Analysis</span>
                  {keggLoading && <Loader2 className="w-3 h-3 text-stone-400 animate-spin" />}
                </div>
                {keggLoading ? (
                  <span className="text-stone-400">데이터를 분석 중입니다...</span>
                ) : (
                  keggInterpretation || "효소 처리 실험 설계 참고용으로 활용할 수 있습니다."
                )}
              </div>

              <div className="space-y-2.5 text-[12px] pt-1">
                {material.kegg_enzymes && material.kegg_enzymes.length > 0 && (
                  <div className="flex items-start gap-3">
                    <span className="text-stone-400 font-medium shrink-0 w-[60px]">관련 효소</span>
                    <span className="text-stone-700 font-medium">
                      {material.kegg_enzymes[0].name} (EC {material.kegg_enzymes[0].id})
                      {material.kegg_enzymes.length > 1 && ` 외 ${material.kegg_enzymes.length - 1}개`}
                    </span>
                  </div>
                )}
                
                {material.kegg_pathways && material.kegg_pathways.length > 0 && (
                  <div className="flex items-start gap-3">
                    <span className="text-stone-400 font-medium shrink-0 w-[60px]">대사 경로</span>
                    <span className="text-stone-700 font-medium">
                      {material.kegg_pathways[0].name}
                      {material.kegg_pathways.length > 1 && ` 외 ${material.kegg_pathways.length - 1}개`}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2.5 border-t border-dashed border-stone-200 text-[10.5px] text-amber-700 leading-relaxed">
                ⚠ 본 해석은 KEGG DB 기반 AI 생성 참고 정보이며 실험적 검증이 필요합니다.<br/>
                <span className="text-stone-400 text-[10px]">출처: KEGG Database (genome.jp)</span>
              </div>
            </div>
          )}

          {/* 3. 특허 선행조사 */}
          {patentStatus === 'unavailable' ? (
            <section className="space-y-2.5 bg-[#FAF7F0]/60 border border-stone-200/60 rounded-2xl p-4.5">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                국내 특허 선행조사 결과
              </h3>
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2 text-stone-500 text-sm py-1">
                  <Clock className="w-4 h-4 shrink-0 mt-0.5 text-stone-400" />
                  <div className="space-y-1">
                    <p className="font-medium text-stone-600">KIPRIS 특허 선행조사 연동 준비 중입니다.</p>
                    <p className="text-[11px] text-stone-400 leading-relaxed">
                      직접 조회:{' '}
                      <a
                        href={`https://www.kipris.or.kr/khome/main.do`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#2D5016] underline underline-offset-2"
                      >
                        kipris.or.kr
                      </a>
                      에서 "{(material.name_ko || material.name)}"로 검색하세요.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          ) : (
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
          )}

          {/* 3.5. 분양 가능 여부 및 확보 방법 */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-stone-300" />
              분양 가능 여부 및 확보 방법
            </h3>
            {(() => {
              const distributionCode = rawDataObj?.['식별번호'] || rawDataObj?.['분양코드'] || rawDataObj?.['분양번호'] || rawDataObj?.['accession_no'] || rawDataObj?.['distribution_code'] || null;
              if (distributionCode) {
                return (
                  <div className="flex flex-col gap-3 bg-[#E1F5EE]/40 border border-[#9FE1CB] rounded-xl p-3.5">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-4.5 h-4.5 text-[#085041] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-[#085041]">산림바이오소재은행 보유 확인 — 분양 신청 가능</p>
                        <div className="mt-2 space-y-1 text-[11px]">
                          <div className="flex gap-2">
                            <span className="w-16 font-semibold text-emerald-800 shrink-0">분양 코드</span>
                            <span className="font-mono font-bold text-[#085041]">{distributionCode}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="w-16 font-semibold text-emerald-800 shrink-0">소재 형태</span>
                            <span className="text-emerald-900">{extractionPart || '식물체'} 정밀 추출물 (에탄올/정제수 분획물)</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="w-16 font-semibold text-emerald-800 shrink-0">신청 기관</span>
                            <span className="text-emerald-900">{material.source_org || '국립산림과학원 산림바이오소재연구소'}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="w-16 font-semibold text-emerald-800 shrink-0">신청 자격</span>
                            <span className="text-emerald-900">산림청장에게 분양신청서 제출 후 승인 시 누구나 신청 가능 (승인까지 약 14일 소요)</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="w-16 font-semibold text-emerald-800 shrink-0">신청 절차</span>
                            <span className="text-emerald-900">
                              ① 분양신청서 작성 → ② 분양신청목록 제출 → ③ 산림청장 승인 → ④ 분양계약서 작성 후 소재 수령
                            </span>
                          </div>
                        </div>
                        <p className="text-[9px] text-[#085041]/60 mt-2 text-right tracking-tight">
                          출처: 농업생명자원 보존·관리 및 이용에 관한 법률 제8조 제1항 기준
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              const speciesName = material.species || material.scientific_name || material.name_ko || '알 수 없음';
              return (
                <div className="flex flex-col gap-3 bg-stone-50 border border-stone-200 rounded-xl p-3.5">
                  <div className="flex items-start gap-3">
                    <CircleHelp className="w-4.5 h-4.5 text-stone-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-stone-700">― 직접 분양 코드 미포함 소재</p>
                    </div>
                  </div>
                  <div className="space-y-2 mt-1">
                    <p className="text-xs font-bold text-stone-600">소재 확보 방법 2가지:</p>
                    
                    <div className="bg-white border border-stone-200 rounded-lg p-3 space-y-1.5 shadow-sm">
                      <p className="text-[11px] font-bold text-stone-700">1. NIFoS 산림바이오소재은행 검색</p>
                      <p className="text-[10px] text-stone-500 leading-relaxed">
                        동일 식물명 또는 학명으로 검색 후 분양 신청 가능 (승인까지 약 14일)<br/>
                        → nifos.go.kr
                      </p>
                      <div className="inline-block px-2 py-1 bg-[#E1F5EE] border border-[#9FE1CB] rounded text-[#085041] text-[10px] font-bold mt-1">
                        검색어: {speciesName}
                      </div>
                    </div>

                    <div className="bg-white border border-stone-200 rounded-lg p-3 space-y-1.5 shadow-sm">
                      <p className="text-[11px] font-bold text-stone-700">2. 국내 천연물 원료 공급사 구매</p>
                      <p className="text-[10px] text-stone-500 leading-relaxed">
                        한국생약협회 회원사 또는 국내 식물 추출물 공급사를 통해 원료 구매 가능
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </section>

          {/* 관련 논문 (PubMed) 섹션 */}
          {(!papersLoading && papers.length > 0) && (
            <section className="space-y-3.5 border-t border-stone-200/60 pt-5">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-stone-300" />
                관련 논문 (PubMed)
              </h3>
              
              <div className="space-y-4">
                {papers.map((paper, idx) => (
                  <div key={paper.pmid || idx} className="space-y-1">
                    <h4 className="text-xs font-bold text-stone-800 leading-snug">
                      {paper.title}
                    </h4>
                    <p className="text-[10px] text-stone-400 font-medium">
                      {paper.authors} · {paper.journal} · {paper.year}
                    </p>
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-[10px] font-bold text-[#2D5016] hover:underline"
                    >
                      → PubMed에서 보기 [외부 링크]
                    </a>
                  </div>
                ))}
              </div>

              <p className="text-[9px] text-stone-400/80 leading-normal border-t border-stone-200/40 pt-2 bg-stone-50/50 p-2 rounded-lg">
                ※ ForestMol은 링크만 제공하며 논문 내용을 요약하거나 보증하지 않습니다.
              </p>
            </section>
          )}

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

