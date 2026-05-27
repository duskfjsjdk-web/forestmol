'use client';

import React, { useState, useEffect } from 'react';
import { updateProject } from '@/app/actions/project';
import { X, FolderEdit, Loader2 } from 'lucide-react';

interface ProjectEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    name: string;
    clientName: string;
    description: string;
    status: string;
  };
  onSuccess: () => void;
}

export const ProjectEditModal: React.FC<ProjectEditModalProps> = ({
  isOpen,
  onClose,
  project,
  onSuccess,
}) => {
  // 1. 수정 폼 상태 선언
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 모달이 열리고 project 정보가 제공되면 필드 초기화
  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setClientName(project.clientName || '');
      setDescription(project.description || '');
      setStatus(project.status || 'active');
      setError(null);
    }
  }, [project, isOpen]);

  if (!isOpen) return null;

  // 폼 전송 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !clientName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await updateProject(
        project.id,
        name.trim(),
        clientName.trim(),
        description.trim(),
        status
      );

      if (res.success) {
        alert('✨ 프로젝트 정보가 성공적으로 수정되었습니다.');
        onSuccess();
        onClose();
      } else {
        setError(res.error || '수정 도중 오류가 발생했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
      {/* 반투명 어두운 배경 */}
      <div
        onClick={loading ? undefined : onClose}
        className="fixed inset-0 bg-[#1A1710]/40 backdrop-blur-[2px] transition-opacity"
      />

      {/* 모달 본체 */}
      <form
        onSubmit={handleSubmit}
        className="relative bg-white rounded-3xl p-8 max-w-md w-full border border-stone-200 shadow-2xl space-y-6 animate-scaleUp z-10"
      >
        {/* 상단 헤더 */}
        <div className="flex justify-between items-center pb-2">
          <h3 className="text-base font-bold text-stone-900 flex items-center gap-1.5">
            <FolderEdit className="w-5 h-5 text-[#2D5016]" />
            프로젝트 정보 수정
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl">
            ⚠️ {error}
          </div>
        )}

        {/* 입력 폼 영역 */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-600 block pl-0.5">프로젝트명</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="프로젝트명을 입력하세요"
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#2D5016]/20 focus:border-[#2D5016] focus:bg-white transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-600 block pl-0.5">고객사(브랜드)명</label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="고객사명을 입력하세요"
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#2D5016]/20 focus:border-[#2D5016] focus:bg-white transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-600 block pl-0.5">프로젝트 설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="프로젝트 목적이나 타겟 스펙 등을 적어주세요 (선택)"
              rows={3}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#2D5016]/20 focus:border-[#2D5016] focus:bg-white transition-all resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-600 block pl-0.5">진행 현황 상태</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#2D5016]/20 focus:border-[#2D5016] focus:bg-white transition-all"
            >
              <option value="active">진행 중 (Active)</option>
              <option value="completed">완료 (Completed)</option>
              <option value="on_hold">보류 (On Hold)</option>
            </select>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-all disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-[#2D5016] hover:bg-[#203a10] disabled:bg-stone-300 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-[#2D5016]/10 flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>저장 중...</span>
              </>
            ) : (
              <span>수정사항 저장</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
