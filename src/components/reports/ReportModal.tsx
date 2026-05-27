'use client';

import React, { useState } from 'react';
import { X, FileText, Check, Copy, ExternalLink, Loader2, ArrowRight, Layers, FileCheck } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    name: string;
    clientName?: string;
  };
  materials: Array<{
    id: string;
    materialId: string;
    materialName: string;
    displaySpecies: string;
    includeInReport: boolean;
  }>;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  project,
  materials = [],
}) => {
  // 1. 상태 변수 설정 (기본적으로 includeInReport가 true인 소재들을 선택 상태로 시작)
  const [template, setTemplate] = useState<'internal' | 'client'>('client');
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>(() =>
    materials.filter((m) => m.includeInReport).map((m) => m.materialId)
  );

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ shareToken: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // 예상 페이지 수 계산 (커버 1쪽 + 요약표 1쪽 + 소재별 N쪽 + 면책고지 1쪽)
  const expectedPages = selectedMaterialIds.length > 0 ? selectedMaterialIds.length + 3 : 3;

  // 소재 체크박스 토글 핸들러
  const handleToggleMaterial = (materialId: string) => {
    setSelectedMaterialIds((prev) =>
      prev.includes(materialId)
        ? prev.filter((id) => id !== materialId)
        : [...prev, materialId]
    );
  };

  // 리포트 생성 실행 함수
  const handleGenerate = async () => {
    if (selectedMaterialIds.length === 0) {
      setError('리포트에 포함할 소재를 최소 1개 이상 선택해 주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/report/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          selectedMaterialIds,
          template,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult({
          shareToken: data.shareToken,
        });
      } else {
        setError(data.error || '리포트 생성 도중 오류가 발생했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '네트워크 통신 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 공유 링크 복사 헬퍼
  const handleCopyLink = () => {
    if (!result) return;
    const origin = window.location.origin;
    const shareUrl = `${origin}/report/${result.shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center font-sans">
      {/* 반투명 어두운 배경 */}
      <div 
        className="absolute inset-0 bg-[#1C1917]/40 backdrop-blur-sm transition-opacity" 
        onClick={loading ? undefined : onClose}
      />

      {/* 모달 박스 */}
      <div className="bg-[#FAF7F0] border border-stone-200 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative z-10 mx-4 transition-all transform scale-100 flex flex-col max-h-[90vh]">
        {/* 상단 헤더 */}
        <div className="bg-white border-b border-stone-150 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#2D5016]">
            <FileText className="w-5 h-5" />
            <h3 className="font-extrabold text-sm text-stone-900">제안 리포트 생성 설정</h3>
          </div>
          <button 
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-all disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 콘텐츠 영역 */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-4 rounded-2xl">
              ⚠️ 에러: {error}
            </div>
          )}

          {!result ? (
            // [설정화면] 리포트 설정 및 소재 선택
            <>
              {/* 템플릿 선택 섹션 */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-stone-400" />
                  보고서 템플릿 선택
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTemplate('client')}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      template === 'client'
                        ? 'border-[#2D5016] bg-[#2D5016]/5 ring-1 ring-[#2D5016]'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-stone-900 mb-1 flex items-center gap-1.5">
                      <span>📨 고객사 제출용</span>
                      {template === 'client' && <Check className="w-3.5 h-3.5 text-[#2D5016]" />}
                    </div>
                    <p className="text-[10px] text-stone-400 leading-relaxed">
                      내부 전용 코멘트나 상세 분석을 숨기고 깔끔한 성분과 특허 요약 위주로 출력합니다.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTemplate('internal')}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      template === 'internal'
                        ? 'border-[#2D5016] bg-[#2D5016]/5 ring-1 ring-[#2D5016]'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-stone-900 mb-1 flex items-center gap-1.5">
                      <span>🏢 내부 검토용</span>
                      {template === 'internal' && <Check className="w-3.5 h-3.5 text-[#2D5016]" />}
                    </div>
                    <p className="text-[10px] text-stone-400 leading-relaxed">
                      R&D 내부 코멘트란 및 관리용 메타데이터 영역을 함께 렌더링하여 서류철을 보관합니다.
                    </p>
                  </button>
                </div>
              </div>

              {/* 포함할 천연 소재 선택 섹션 */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-stone-400" />
                  제안 리포트에 담을 소재 선택
                </label>
                
                {materials.length > 0 ? (
                  <div className="bg-white border border-stone-200 rounded-2xl divide-y divide-stone-150 overflow-hidden max-h-[220px] overflow-y-auto shadow-inner">
                    {materials.map((m) => {
                      const isChecked = selectedMaterialIds.includes(m.materialId);
                      return (
                        <label 
                          key={m.id} 
                          className="px-4 py-3.5 flex items-center justify-between hover:bg-stone-50/50 cursor-pointer transition-colors select-none"
                        >
                          <div className="min-w-0 pr-4">
                            <p className="text-xs font-bold text-stone-800 truncate">{m.materialName}</p>
                            <p className="text-[10px] text-stone-400 font-mono mt-0.5 truncate">{m.displaySpecies}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleMaterial(m.materialId)}
                            className="w-4 h-4 rounded border-stone-300 text-[#2D5016] focus:ring-[#2D5016] cursor-pointer"
                          />
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white border border-stone-200 border-dashed rounded-2xl py-8 text-center">
                    <p className="text-xs text-stone-400">선택 가능한 소재가 프로젝트에 없습니다.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            // [완료화면] HTML 리포트 생성 완료
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-[#2D5016]/10 flex items-center justify-center text-[#2D5016] animate-bounce">
                <FileCheck className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-stone-900 text-base">리포트 생성이 완료되었습니다!</h4>
                <p className="text-xs text-stone-400 leading-relaxed max-w-sm">
                  산림 공공데이터를 기반으로 한 보고서가 생성되었습니다. 아래의 웹 뷰어에서 확인 및 즉시 인쇄(PDF 저장)가 가능합니다.
                </p>
              </div>

              {/* 액션 버튼 그룹 */}
              <div className="w-full space-y-2.5 pt-4">
                <a
                  href={`/report/${result.shareToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 py-3.5 bg-[#2D5016] hover:bg-[#203a10] text-white font-bold text-xs rounded-2xl transition-all shadow-md shadow-[#2D5016]/10"
                >
                  <span>웹 뷰어에서 리포트 열기 및 인쇄</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-1.5 py-3.5 bg-white border border-stone-200 hover:border-stone-300 text-stone-700 font-bold text-xs rounded-2xl transition-all hover:bg-stone-50"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-[#2D5016]" />
                      <span className="text-[#2D5016]">공유 링크 복사 완료!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>비로그인용 30일 임시 공유 링크 복사</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-stone-400 font-medium">
                ※ 복사된 공유 링크는 로그인을 하지 않아도 접근 가능하며, 30일 뒤 만료됩니다.
              </p>
            </div>
          )}
        </div>

        {/* 하단 푸터 및 생성 실행 */}
        {!result && (
          <div className="bg-white border-t border-stone-150 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* 리포트 정보 요약 */}
            <div className="text-left">
              <p className="text-xs font-extrabold text-stone-800 truncate max-w-[200px]">
                {project.name}
              </p>
              <p className="text-[10px] text-stone-400 font-medium mt-0.5">
                선택된 소재 {selectedMaterialIds.length}개 · 예상 약 {expectedPages}쪽
              </p>
            </div>

            {/* 생성 단추 */}
            <button
              onClick={handleGenerate}
              disabled={loading || selectedMaterialIds.length === 0}
              className="flex items-center justify-center gap-2 py-3 px-6 bg-[#2D5016] hover:bg-[#203a10] text-white font-bold text-xs rounded-2xl transition-all shadow-md shadow-[#2D5016]/10 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap self-stretch sm:self-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>리포트 제작 중...</span>
                </>
              ) : (
                <>
                  <span>제안 리포트 생성하기</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

