'use client';

import React, { useEffect, useState } from 'react';
import { getReports } from '@/app/actions/report';
import { deleteReport, deleteReports } from '@/app/actions/deleteReport';
import { FileText, Loader2, Download, Copy, Check, Calendar, Folder, ExternalLink, Globe, Trash2 } from 'lucide-react';

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // 삭제 확인 모달 대상 및 로딩 상태
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 다중 선택 관리 상태
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMultiDeleteModalOpen, setIsMultiDeleteModalOpen] = useState(false);

  // 리포트 리스트 로드 함수
  const loadReports = async () => {
    setLoading(true);
    const data = await getReports();
    setReports(data);
    setLoading(false);
  };

  useEffect(() => {
    loadReports();
  }, []);

  // 공유 링크 복사 핸들러 (보안 브라우저 및 비보안 오리진 대응 Fallback 복사 탑재)
  const handleCopyLink = async (shareToken: string, reportId: string) => {
    const origin = window.location.origin;
    const shareUrl = `${origin}/share/${shareToken}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedId(reportId);
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch (err) {
      // 구식 브라우저 또는 비보안 오리진(http)을 위한 Fallback 복사 처리
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedId(reportId);
        setTimeout(() => setCopiedId(null), 2000);
      } catch (copyErr) {
        console.error('클립보드 복사 최종 실패:', copyErr);
        alert(`복사에 실패했습니다. 아래 주소를 드래그해서 복사해 주세요:\n${shareUrl}`);
      }
      document.body.removeChild(textArea);
    }
  };

  // 삭제 버튼 클릭 시 모달 기동
  const handleDeleteClick = (report: any) => {
    setDeleteTarget(report);
  };

  // 실제 삭제 확인 시 처리 엔진
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);

    // 낙관적 업데이트 (목록에서 우선 제거)
    const originalReports = [...reports];
    setReports(prev => prev.filter(r => r.id !== deleteTarget.id));
    setSelectedIds(prev => prev.filter(id => id !== deleteTarget.id)); // 선택 목록에서도 해제

    const res = await deleteReport(deleteTarget.id);

    if (res.success) {
      alert('🎉 리포트가 성공적으로 삭제됐습니다.');
      setDeleteTarget(null);
    } else {
      // 삭제 실패 시 원래 리스트로 롤백
      setReports(originalReports);
      alert(`⚠️ 삭제 실패: ${res.error || '알 수 없는 오류가 발생했습니다.'}`);
    }
    setDeleteLoading(false);
  };

  // 다중 선택 토글 핸들러
  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(reports.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectOne = (reportId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, reportId]);
    } else {
      setSelectedIds(prev => prev.filter(id => id !== reportId));
    }
  };

  // 다중 삭제 처리 엔진
  const handleConfirmMultiDelete = async () => {
    if (selectedIds.length === 0) return;
    setDeleteLoading(true);

    // 낙관적 업데이트
    const originalReports = [...reports];
    setReports(prev => prev.filter(r => !selectedIds.includes(r.id)));
    const deletedCount = selectedIds.length;

    const res = await deleteReports(selectedIds);

    if (res.success) {
      alert(`🎉 선택한 리포트 ${deletedCount}개가 삭제됐습니다.`);
      setSelectedIds([]);
      setIsMultiDeleteModalOpen(false);
    } else {
      // 실패 시 롤백
      setReports(originalReports);
      alert(`⚠️ 삭제 실패: ${res.error || '알 수 없는 오류가 발생했습니다.'}`);
    }
    setDeleteLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] px-10 py-8 font-sans">
      
      {/* 상단 헤더 영역 */}
      <div className="flex justify-between items-end border-b border-stone-200/80 pb-5 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-[#2D5016]" />
            R&D 제안 리포트 보관소
          </h1>
          <p className="text-xs text-stone-400 font-medium mt-1">
            프로젝트별로 AI RAG 분석 및 특허 선행 조사를 거쳐 발행 완료된 PDF 제안서 아카이브입니다.
          </p>
        </div>
        
        {/* 다중 선택 일괄 삭제 버튼 */}
        {selectedIds.length > 0 && (
          <button
            onClick={() => setIsMultiDeleteModalOpen(true)}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-2xl transition-all shadow-md shadow-red-600/10 flex items-center gap-1.5 shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>선택 리포트 {selectedIds.length}개 삭제</span>
          </button>
        )}
      </div>

      {/* 리포트 테이블 공간 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40">
          <Loader2 className="w-8 h-8 text-[#2D5016] animate-spin mb-3" />
          <span className="text-xs font-bold text-stone-400">발행된 제안서들을 정렬하는 중...</span>
        </div>
      ) : reports.length > 0 ? (
        <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50/70 border-b border-stone-150 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                  <th className="w-12 px-6 py-4">
                    <input
                      type="checkbox"
                      checked={reports.length > 0 && selectedIds.length === reports.length}
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-stone-300 text-[#2D5016] focus:ring-[#2D5016] cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4">리포트 제목 / 프로젝트</th>
                  <th className="px-6 py-4">고객사</th>
                  <th className="px-6 py-4">함유 소재 수</th>
                  <th className="px-6 py-4">생성 및 만료일</th>
                  <th className="px-6 py-4 text-right">인쇄 및 공유</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-150 text-xs">
                {reports.map((report) => {
                  const createdDate = new Date(report.createdAt).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  });
                  const expiresDate = new Date(report.expiresAt).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  });
                  const isCopied = copiedId === report.id;

                  return (
                    <tr key={report.id} className={`hover:bg-stone-50/40 transition-colors ${selectedIds.includes(report.id) ? 'bg-[#2D5016]/[0.01]' : ''}`}>
                      {/* 개별 선택 체크박스 */}
                      <td className="w-12 px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(report.id)}
                          onChange={(e) => handleToggleSelectOne(report.id, e.target.checked)}
                          onClick={(e) => e.stopPropagation()} // 행 클릭 이벤트 간섭 방지
                          className="w-4 h-4 rounded border-stone-300 text-[#2D5016] focus:ring-[#2D5016] cursor-pointer"
                        />
                      </td>
                      {/* 리포트 제목 / 프로젝트 */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className="font-extrabold text-stone-850 hover:text-[#2D5016] transition-colors flex items-center gap-1">
                            {report.title}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-stone-400">
                            <Folder className="w-3.5 h-3.5" />
                            <span>연결 프로젝트: <span className="font-semibold text-stone-600">{report.projectName}</span></span>
                          </div>
                        </div>
                      </td>

                      {/* 고객사 */}
                      <td className="px-6 py-4 font-semibold text-stone-700">
                        {report.clientName}
                      </td>

                      {/* 함유 소재 수 */}
                      <td className="px-6 py-4">
                        <span className="font-bold text-stone-600 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-full text-[10px]">
                          천연 소재 {report.materialCount}개
                        </span>
                      </td>

                      {/* 날짜 */}
                      <td className="px-6 py-4">
                        <div className="space-y-0.5 text-[10px]">
                          <div className="flex items-center gap-1 text-stone-500">
                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                            <span>발행: {createdDate}</span>
                          </div>
                          <div className="text-stone-400">
                            <span>만료: {expiresDate}</span>
                          </div>
                        </div>
                      </td>

                      {/* 다운로드 및 복사 버튼 그룹 */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* PDF 직접 다운로드 / 없을 시 공유용 웹 리포트로 대체 열기 */}
                          <a
                            href={report.pdfUrl || `/share/${report.shareToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl border border-stone-200 bg-white hover:border-[#2D5016]/30 text-stone-500 hover:text-[#2D5016] transition-all shadow-sm"
                            title={report.pdfUrl ? "리포트 열기 / 다운로드" : "웹 제안 리포트 열기"}
                          >
                            <Download className="w-4 h-4" />
                          </a>

                          {/* 공유 링크 복사 */}
                          <button
                            onClick={() => handleCopyLink(report.shareToken, report.id)}
                            className={`p-2 rounded-xl border transition-all shadow-sm ${
                              isCopied
                                ? 'border-[#2D5016] bg-[#2D5016]/5 text-[#2D5016]'
                                : 'border-stone-200 bg-white hover:border-[#2D5016]/30 text-stone-500 hover:text-[#2D5016]'
                            }`}
                            title="30일 공유 링크 복사"
                          >
                            {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>

                          {/* 리포트 삭제 버튼 (가시성 및 hover 피드백 보완) */}
                          <button
                            onClick={() => handleDeleteClick(report)}
                            className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-red-50 hover:border-red-200 text-stone-400 hover:text-red-600 transition-all shadow-sm opacity-60 hover:opacity-100"
                            title="리포트 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // 생성된 리포트 없음
        <div className="flex flex-col items-center justify-center py-32 text-center max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 mb-5">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-stone-700 mb-1.5 text-sm">발행된 제안서가 없습니다</h3>
          <p className="text-xs text-stone-400 mb-6 leading-relaxed">
            프로젝트 관리 메뉴로 이동하여 원하는 천연 소재들을 담은 뒤 제안 리포트를 생성해 보세요.
          </p>
        </div>
      )}

      {/* 5. 삭제 확인 모달 팝업 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* 어두운 배경 */}
          <div onClick={() => setDeleteTarget(null)} className="fixed inset-0 bg-[#1A1710]/60 backdrop-blur-[1px]" />
          
          {/* 모달 폼 */}
          <div className="relative bg-white rounded-3xl p-7 max-w-sm w-full border border-stone-200 shadow-2xl space-y-5 animate-scaleUp">
            <div className="space-y-2">
              <h4 className="text-base font-extrabold text-stone-900 leading-tight">
                리포트를 삭제하시겠습니까?
              </h4>
              <p className="text-xs text-stone-500 leading-relaxed">
                <span className="font-bold text-stone-700">'{deleteTarget.title}'</span>을 삭제하면 공유 링크도 함께 만료됩니다. 이 작업은 되돌릴 수 없습니다.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-all"
                disabled={deleteLoading}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-stone-300 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-red-600/10 flex items-center justify-center gap-1.5"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>삭제 중...</span>
                  </>
                ) : (
                  <span>삭제</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. 다중 삭제 확인 모달 팝업 */}
      {isMultiDeleteModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* 어두운 배경 */}
          <div onClick={() => setIsMultiDeleteModalOpen(false)} className="fixed inset-0 bg-[#1A1710]/60 backdrop-blur-[1px]" />
          
          {/* 모달 폼 */}
          <div className="relative bg-white rounded-3xl p-7 max-w-sm w-full border border-stone-200 shadow-2xl space-y-5 animate-scaleUp">
            <div className="space-y-2">
              <h4 className="text-base font-extrabold text-stone-900 leading-tight">
                선택한 리포트들을 삭제하시겠습니까?
              </h4>
              <p className="text-xs text-stone-500 leading-relaxed">
                선택한 <span className="font-extrabold text-stone-700">{selectedIds.length}개</span>의 리포트를 삭제하면 외부 공유용 웹 링크도 즉시 만료됩니다. 이 작업은 되돌릴 수 없습니다.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsMultiDeleteModalOpen(false)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-all"
                disabled={deleteLoading}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmMultiDelete}
                disabled={deleteLoading}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-stone-300 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-red-600/10 flex items-center justify-center gap-1.5"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>삭제 중...</span>
                  </>
                ) : (
                  <span>삭제</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
