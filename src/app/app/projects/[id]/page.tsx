'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getProjectDetail, toggleMaterialReportStatus, removeMaterialFromProject } from '@/app/actions/project';
import { ArrowLeft, Folder, User, CheckSquare, Square, FileText, ChevronRight, Loader2, Info, Edit2, X } from 'lucide-react';
import { ReportModal } from '@/components/reports/ReportModal';
import { ProjectEditModal } from '@/components/projects/ProjectEditModal';
import { MaterialSlideOver } from '@/components/search/MaterialSlideOver';
import { supabase } from '@/lib/supabase';



export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const projectId = params.id;

  const [project, setProject] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // 삭제용 상태 추가
  const [deletingMaterial, setDeletingMaterial] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 상세 조회를 위한 상태 추가
  const [selectedMaterial, setSelectedMaterial] = useState<any | null>(null);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [slideOverLoading, setSlideOverLoading] = useState(false);

  const handleOpenMaterialDetail = async (materialId: string) => {
    setSlideOverLoading(true);
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('id', materialId)
        .single();

      if (error || !data) {
        alert('소재 정보를 불러올 수 없습니다.');
        return;
      }

      setSelectedMaterial(data);
      setIsSlideOverOpen(true);
    } catch (err) {
      console.error('소재 상세 조회 에러:', err);
      alert('소재 정보를 불러올 수 없습니다.');
    } finally {
      setSlideOverLoading(false);
    }
  };



  // 상세 데이터 로드 함수
  const loadDetail = async () => {
    setLoading(true);
    const data = await getProjectDetail(projectId);
    if (data) {
      setProject(data.project);
      setMaterials(data.materials);
    } else {
      alert('프로젝트를 찾을 수 없거나 접근 권한이 없습니다.');
      router.push('/app/projects');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // 리포트 포함 여부 토글 핸들러
  const handleToggleReport = async (projectMaterialId: string, currentStatus: boolean) => {
    setUpdatingId(projectMaterialId);
    const nextStatus = !currentStatus;
    const res = await toggleMaterialReportStatus(projectMaterialId, nextStatus);
    setUpdatingId(null);

    if (res.success) {
      // 로컬 상태 갱신
      setMaterials(prev =>
        prev.map(m => (m.id === projectMaterialId ? { ...m, includeInReport: nextStatus } : m))
      );
    } else {
      alert(`⚠️ 상태 변경 실패: ${res.error}`);
    }
  };

  // 소재 제거 핸들러
  const handleRemoveMaterial = async () => {
    if (!deletingMaterial) return;
    setIsDeleting(true);
    const res = await removeMaterialFromProject(deletingMaterial.id);
    setIsDeleting(false);

    if (res.success) {
      // 낙관적 업데이트
      setMaterials(prev => prev.filter(m => m.id !== deletingMaterial.id));
      alert('소재가 프로젝트에서 제거됐습니다.');
      setDeletingMaterial(null);
    } else {
      alert(`⚠️ 제거 실패: ${res.error}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F0] flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 text-[#2D5016] animate-spin mb-3" />
        <span className="text-xs font-bold text-stone-400">프로젝트 서랍을 열어보는 중...</span>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="min-h-screen bg-[#FAF7F0] px-10 py-8 font-sans">
      
      {/* 뒤로가기 버튼 */}
      <Link
        href="/app/projects"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-400 hover:text-[#2D5016] transition-colors mb-5 group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        <span>프로젝트 목록으로 돌아가기</span>
      </Link>

      {/* 헤더 영역: 프로젝트명 + 고객사 */}
      <div className="bg-white border border-stone-200 rounded-3xl p-7 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#2D5016]/10 flex items-center justify-center text-[#2D5016]">
              <Folder className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-extrabold text-stone-900 leading-tight">
              {project.name}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 font-medium pl-1">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-stone-400" />
              고객사: <span className="font-bold text-stone-800">{project.clientName}</span>
            </span>
            {project.description && (
              <span className="text-stone-400 font-normal">| {project.description}</span>
            )}
          </div>
        </div>

        {/* 버튼 그룹 */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          {/* 수정 버튼 */}
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4.5 py-3 border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-600 font-bold text-xs rounded-2xl transition-all whitespace-nowrap bg-white shadow-sm"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>수정</span>
          </button>

          {/* 리포트 작성 버튼 (소재가 있을 때만 활성화) */}
          {materials.length > 0 && (
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-5 py-3 bg-[#2D5016] hover:bg-[#203a10] text-white font-bold text-xs rounded-2xl transition-all shadow-md shadow-[#2D5016]/10 whitespace-nowrap"
            >
              <FileText className="w-4 h-4" />
              <span>📄 제안 리포트 생성</span>
            </button>
          )}
        </div>


      </div>

      {/* 담긴 천연 소재 목록 섹션 */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest">
            프로젝트 검토 소재 리스트 ({materials.length})
          </h2>
          <span className="text-[10px] text-stone-400 font-medium">
            ※ 체크박스를 해제하면 최종 제안 리포트 작성 시 해당 소재가 제외됩니다.
          </span>
        </div>

        {materials.length > 0 ? (
          <div className="space-y-3.5">
            {materials.map((m) => {
              const isUpdating = updatingId === m.id;

              return (
                <div
                  key={m.id}
                  onClick={() => {
                    handleOpenMaterialDetail(m.materialId);
                  }}
                  className="bg-white border border-stone-200 rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-[#2D5016] hover:shadow-md hover:shadow-[#2D5016]/5 transition-all duration-200 cursor-pointer shadow-sm group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* 리포트 포함 체크박스 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // 카드 전체 클릭(소재 검색 이동) 방지
                        handleToggleReport(m.id, m.includeInReport);
                      }}
                      disabled={isUpdating}
                      className="p-1 rounded-lg text-stone-400 hover:text-[#2D5016] disabled:opacity-50 transition-colors relative z-10"
                      title={m.includeInReport ? '리포트에서 제외' : '리포트에 포함'}
                    >
                      {isUpdating ? (
                        <Loader2 className="w-5.5 h-5.5 animate-spin text-[#2D5016]" />
                      ) : m.includeInReport ? (
                        <CheckSquare className="w-5.5 h-5.5 text-[#2D5016] fill-[#2D5016]/8" />
                      ) : (
                        <Square className="w-5.5 h-5.5 text-stone-300" />
                      )}
                    </button>

                    {/* 소재 정보 */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm text-stone-900 truncate group-hover:text-[#2D5016] transition-colors">
                          {m.materialName}
                        </h3>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-stone-50 border border-stone-150 text-stone-500 rounded-md">
                          {m.dataSource}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 font-mono truncate">
                        {m.displaySpecies ? m.displaySpecies.replace(/&amp;/g, '&') : ''}
                      </p>
                    </div>
                  </div>

                  {/* 삭제 단추 & Chevron 아이콘 */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // 카드 상세 뷰 팝업 방지
                        setDeletingMaterial({ id: m.id, name: m.materialName });
                      }}
                      className="p-1 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all relative z-10"
                      title="소재 제거"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="text-stone-300 group-hover:text-[#2D5016] transition-colors">
                      {slideOverLoading && selectedMaterial?.id === m.materialId ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#2D5016]" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // 담긴 소재 없음
          <div className="bg-white border border-stone-200 border-dashed rounded-3xl py-24 text-center max-w-md mx-auto flex flex-col items-center justify-center p-6">
            <div className="w-12 h-12 rounded-xl bg-stone-50 flex items-center justify-center text-stone-300 mb-4">
              <Info className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-stone-600 mb-1.5 text-xs">담긴 천연 소재가 없습니다</h4>
            <p className="text-[11px] text-stone-400 mb-5 leading-relaxed">
              AI 소재 탐색 메뉴에서 제안서에 넣을 효능 소재를 검색한 다음, 카드를 눌러 이 프로젝트에 담아보세요.
            </p>
            <Link
              href="/app/search"
              className="py-2.5 px-4.5 bg-[#2D5016] hover:bg-[#203a10] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-[#2D5016]/10"
            >
              소재 탐색하러 가기
            </Link>
          </div>
        )}
      </div>

      {/* 리포트 생성 설정 및 다운로드 모달 */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        project={{
          id: project.id,
          name: project.name,
          clientName: project.clientName || '미지정',
        }}
        materials={materials}
      />

      {/* 프로젝트 수정 모달 */}
      <ProjectEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        project={{
          id: project.id,
          name: project.name,
          clientName: project.clientName || '미지정',
          description: project.description || '',
          status: project.status || 'active',
        }}
        onSuccess={loadDetail}
      />

      {/* 상세 정보 슬라이드오버 */}
      <MaterialSlideOver
        material={selectedMaterial}
        isOpen={isSlideOverOpen}
        onClose={() => setIsSlideOverOpen(false)}
      />

      {/* 소재 제거 확인 모달 */}
      {deletingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center font-sans">
          <div 
            className="absolute inset-0 bg-[#1C1917]/40 backdrop-blur-sm" 
            onClick={() => !isDeleting && setDeletingMaterial(null)}
          />
          <div className="bg-white border border-stone-200 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative z-10 mx-4 p-6">
            <h3 className="font-extrabold text-stone-900 text-sm mb-2">소재 프로젝트에서 제거</h3>
            <p className="text-xs text-stone-500 leading-relaxed mb-6">
              '{deletingMaterial.name}'을 프로젝트에서 제거하시겠습니까?<br />
              <span className="text-stone-400 text-[10px] font-medium">※ 소재 정보 자체는 삭제되지 않고 현재 프로젝트에서만 빠집니다.</span>
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingMaterial(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-all disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleRemoveMaterial}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-750 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-red-600/10 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>제거</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


