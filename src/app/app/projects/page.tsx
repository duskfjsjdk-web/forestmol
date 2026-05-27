'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProjects, createProject, deleteProject } from '@/app/actions/project';
import { Folder, FolderPlus, Plus, Loader2, Calendar, User, ChevronRight, X, Sparkles, MoreVertical } from 'lucide-react';
import { ProjectEditModal } from '@/components/projects/ProjectEditModal';


export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectClient, setNewProjectClient] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // 더보기 메뉴 및 수정 모달 상태
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);


  // 프로젝트 목록 로드 함수
  const loadProjects = async () => {
    setLoading(true);
    const list = await getProjects();
    setProjects(list);
    setLoading(false);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // 외부 클릭 시 더보기 메뉴 닫기 에펙트
  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveMenuId(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // 프로젝트 삭제 처리
  const handleDeleteProject = async (id: string, name: string) => {
    if (confirm(`⚠️ 프로젝트 [${name}]을 정말로 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며 담긴 소재 목록도 함께 삭제됩니다.`)) {
      const res = await deleteProject(id);
      if (res.success) {
        alert('🗑️ 프로젝트가 성공적으로 삭제되었습니다.');
        loadProjects();
      } else {
        alert(`❌ 프로젝트 삭제 실패: ${res.error}`);
      }
    }
  };


  // 새 프로젝트 만들기 폼 전송
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !newProjectClient.trim()) return;

    setCreateLoading(true);
    const res = await createProject(newProjectName.trim(), newProjectClient.trim());
    setCreateLoading(false);

    if (res.success) {
      setShowModal(false);
      setNewProjectName('');
      setNewProjectClient('');
      loadProjects(); // 목록 리로드
      alert(`✨ 새 프로젝트 [${newProjectName}]이 성공적으로 생성되었습니다.`);
    } else {
      alert(`❌ 프로젝트 생성 실패: ${res.error}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] px-10 py-8 font-sans">
      
      {/* 상단 헤더 영역 */}
      <div className="flex justify-between items-center border-b border-stone-200/80 pb-5 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 flex items-center gap-2">
            <Folder className="w-7 h-7 text-[#2D5016]" />
            제안 프로젝트 관리
          </h1>
          <p className="text-xs text-stone-400 font-medium mt-1">
            화장품 ODM 제안서 및 바이오 소재 후보군을 분류하여 관리하는 프로젝트 서랍장입니다.
          </p>
        </div>

        {/* 새 프로젝트 버튼 */}
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4.5 py-3 bg-[#2D5016] hover:bg-[#203a10] text-white font-bold text-xs rounded-2xl transition-all shadow-md shadow-[#2D5016]/10"
        >
          <Plus className="w-4 h-4" />
          <span>새 프로젝트</span>
        </button>
      </div>

      {/* 프로젝트 목록 공간 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40">
          <Loader2 className="w-8 h-8 text-[#2D5016] animate-spin mb-3" />
          <span className="text-xs font-bold text-stone-400">프로젝트 목록을 열어보는 중...</span>
        </div>
      ) : projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {projects.map((project) => {
            const formattedDate = new Date(project.createdAt).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            });

            // 상태값 표시 텍스트 및 배지 색상 매핑
            const getStatusBadge = (status: string) => {
              switch (status) {
                case 'completed':
                  return {
                    label: '완료',
                    style: 'bg-stone-100 text-stone-600 border-stone-200'
                  };
                case 'on_hold':
                  return {
                    label: '보류',
                    style: 'bg-amber-50 text-amber-700 border-amber-200/60'
                  };
                default:
                  return {
                    label: '진행 중',
                    style: 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                  };
              }
            };

            const statusBadge = getStatusBadge(project.status);

            return (
              <div
                key={project.id}
                onClick={() => router.push(`/app/projects/${project.id}`)}
                className="group relative bg-white border border-stone-200 rounded-3xl p-6 flex flex-col justify-between min-h-[180px] hover:border-[#2D5016]/30 hover:shadow-lg hover:shadow-[#2D5016]/5 transition-all duration-300 cursor-pointer"
              >
                {/* 카드 상부 */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    {/* 프로젝트 상태 태그 */}
                    <span className={`text-[9px] font-black tracking-wider border px-2 py-0.5 rounded-md uppercase ${statusBadge.style}`}>
                      {statusBadge.label}
                    </span>

                    {/* 배지 그룹 (소재수 + 더보기) */}
                    <div className="flex items-center gap-1.5 relative">
                      <span className="text-[10px] font-bold text-stone-400 bg-stone-50 border border-stone-150 px-2 py-0.5 rounded-full">
                        소재 {project.materialCount}개
                      </span>
                      
                      {/* 드롭다운 트리거 버튼 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // 상세로 이동하는 카드 클릭 이벤트 전파 완전 차단
                          setActiveMenuId(activeMenuId === project.id ? null : project.id);
                        }}
                        className="p-1 rounded-lg text-stone-400 hover:text-[#2D5016] hover:bg-stone-50 transition-colors"
                        title="프로젝트 관리"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {/* 3단 드롭다운 메뉴 박스 */}
                      {activeMenuId === project.id && (
                        <div className="absolute right-0 top-7 w-24 bg-white border border-stone-200 rounded-xl shadow-xl z-20 py-1 text-[11px] animate-scaleUp">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                              setSelectedProject(project);
                              setShowEditModal(true);
                            }}
                            className="w-full text-left px-3.5 py-2 text-stone-700 hover:bg-stone-50 hover:text-[#2D5016] font-bold transition-colors flex items-center gap-1"
                          >
                            <span>✏️ 수정</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                              handleDeleteProject(project.id, project.name);
                            }}
                            className="w-full text-left px-3.5 py-2 text-red-600 hover:bg-red-50 font-bold transition-colors flex items-center gap-1"
                          >
                            <span>🗑️ 삭제</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-stone-900 group-hover:text-[#2D5016] transition-colors leading-snug line-clamp-1">
                      {project.name}
                    </h3>
                    <p className="text-xs text-stone-500 font-medium flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-stone-400" />
                      고객사: <span className="font-bold text-stone-700">{project.clientName}</span>
                    </p>
                  </div>
                </div>

                {/* 카드 하부 */}
                <div className="border-t border-stone-100 pt-4 flex justify-between items-center text-[10px] text-stone-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    생성일: {formattedDate}
                  </span>
                  <span className="flex items-center gap-0.5 font-bold text-[#2D5016] opacity-0 group-hover:opacity-100 transition-opacity">
                    자세히 보기
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      ) : (
        // 프로젝트 없음 화면
        <div className="flex flex-col items-center justify-center py-32 text-center max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 mb-5">
            <Folder className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-stone-700 mb-1.5 text-sm">진행 중인 프로젝트가 없습니다</h3>
          <p className="text-xs text-stone-400 mb-6 leading-relaxed">
            새 프로젝트를 만들어 소재 탐색 결과를 모으고 제안 리포트를 완성해보세요.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4.5 py-3 bg-[#2D5016] hover:bg-[#203a10] text-white font-bold text-xs rounded-2xl transition-all shadow-md shadow-[#2D5016]/10"
          >
            <Plus className="w-4 h-4" />
            <span>첫 프로젝트 만들기</span>
          </button>
        </div>
      )}

      {/* 새 프로젝트 생성 모달 다이얼로그 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowModal(false)}
            className="fixed inset-0 bg-[#1A1710]/40 backdrop-blur-[2px] transition-opacity"
          />

          <form
            onSubmit={handleCreateProject}
            className="relative bg-white rounded-3xl p-8 max-w-md w-full border border-stone-200 shadow-2xl space-y-6 animate-scaleUp"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-1.5">
                <FolderPlus className="w-5 h-5 text-[#2D5016]" />
                새 제안 프로젝트 생성
              </h3>
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
                  placeholder="예: 2026 동백 미백 에센스 라인 개발"
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
                  placeholder="예: 코스메카코리아, 씨앤씨인터내셔널"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#2D5016]/20 focus:border-[#2D5016] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="flex gap-2">
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
                  <span>프로젝트 생성</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* 프로젝트 수정 모달 */}
      <ProjectEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedProject(null);
        }}
        project={{
          id: selectedProject?.id || '',
          name: selectedProject?.name || '',
          clientName: selectedProject?.clientName || '',
          description: selectedProject?.description || '',
          status: selectedProject?.status || 'active',
        }}
        onSuccess={loadProjects}
      />
    </div>
  );
}

