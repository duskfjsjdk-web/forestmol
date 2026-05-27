"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { X, Check, Loader2, AlertCircle } from 'lucide-react';
import { submitPilot } from '@/app/actions/submitPilot';

type ModalId = 'search' | 'patent' | 'report' | 'data' | 'pilot' | null;

interface ModalContextType {
  activeModal: ModalId;
  openModal: (id: ModalId) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [activeModal, setActiveModal] = useState<ModalId>(null);
  const [shouldRender, setShouldRender] = useState(false);

  const openModal = (id: ModalId) => {
    setActiveModal(id);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  // 모달이 열리면 바디 스크롤을 막고, 닫히면 풉니다.
  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = 'hidden';
      setShouldRender(true);
    } else {
      document.body.style.overflow = '';
      // 트랜지션 애니메이션 완료 후 언마운트하기 위해 약간의 딜레이를 줍니다.
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [activeModal]);

  // ESC 키 클릭 시 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ModalContext.Provider value={{ activeModal, openModal, closeModal }}>
      {children}
      {shouldRender && <ModalSystem />}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}

function ModalSystem() {
  const { activeModal, closeModal, openModal } = useModal();
  const [isOpen, setIsOpen] = useState(false);

  // 파일럿 신청 양식 상태
  const [pilotName, setPilotName] = useState('');
  const [pilotCompany, setPilotCompany] = useState('');
  const [pilotEmail, setPilotEmail] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  // 모달 변경 시 애니메이션 동기화
  useEffect(() => {
    if (activeModal) {
      // 마운트 후 애니메이션 시작
      const timer = setTimeout(() => setIsOpen(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsOpen(false);
    }
  }, [activeModal]);

  // 카테고리 칩 선택 토글
  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  // 파일럿 신청 폼 제출
  const handlePilotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategories.length === 0) {
      setSubmitResult({ success: false, message: "하나 이상의 관심 카테고리를 선택해주세요." });
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await submitPilot({
        name: pilotName,
        company: pilotCompany,
        email: pilotEmail,
        categories: selectedCategories
      });
      setSubmitResult(res);
      if (res.success) {
        setPilotName('');
        setPilotCompany('');
        setPilotEmail('');
        setSelectedCategories([]);
      }
    } catch (err) {
      setSubmitResult({ success: false, message: "신청 중 서버 오류가 발생했습니다." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const CATEGORY_OPTIONS = [
    "항노화/탄력",
    "피부 진정/장벽",
    "미백/톤업",
    "항균/방부",
    "보습/수분",
    "두피/모발",
    "항산화",
    "발효 유래",
    "기타 직접 입력"
  ];

  if (!activeModal) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-end justify-center">
      {/* 백드롭 레이어 */}
      <div 
        onClick={closeModal} 
        className={`fixed inset-0 bg-[#16402A]/50 backdrop-blur-[8px] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`} 
      />

      {/* 바텀 시트 모달 판넬 */}
      <div 
        className={`relative w-full max-w-[680px] bg-[#F6FBFF] rounded-t-[18px] overflow-hidden shadow-[0_-10px_40px_rgba(27,77,50,0.15)] z-10 max-h-[82vh] flex flex-col text-[#1B4D32] transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* 모달 헤더 (Sticky) */}
        <div className="sticky top-0 bg-[#F6FBFF] z-20 px-[38px] pt-[30px] pb-[22px] flex justify-between items-start border-b border-[#C8DDD2]/50">
          <div>
            <h3 className="font-fraunces text-[23px] font-semibold text-[#1B4D32]">
              {activeModal === 'search' && "AI 소재 탐색"}
              {activeModal === 'patent' && "KIPRIS 특허 선행조사"}
              {activeModal === 'report' && "AI 제안 리포트"}
              {activeModal === 'data' && "데이터 수집 구조"}
              {activeModal === 'pilot' && "무료 파일럿 신청"}
            </h3>
            <p className="text-[12.5px] font-dmsans text-[#4A6358] mt-1 font-light">
              {activeModal === 'search' && "자연어 AI 의미론적 검색 기능 소개"}
              {activeModal === 'patent' && "실시간 특허 매칭 및 대안 자동 제안"}
              {activeModal === 'report' && "연구원 업무 보고용 PDF/HTML 제안서 구성"}
              {activeModal === 'data' && "산림 7종 공공데이터 및 국제 오픈 DB 연동"}
              {activeModal === 'pilot' && "24시간 내 맞춤형 분석 리포트 발송"}
            </p>
          </div>
          <button 
            onClick={closeModal} 
            className="w-[34px] h-[34px] rounded-full bg-[#DCF0E4] hover:bg-[#C8DDD2] flex items-center justify-center text-[#1B4D32] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 모달 콘텐츠 본문 (스크롤) */}
        <div className="overflow-y-auto p-[38px] pt-6 flex-1 space-y-7">
          
          {/* 1) 소재 탐색 모달 */}
          {activeModal === 'search' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* 통계 카드 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#E8F2FB] border border-[#58AC6E]/12 rounded-xl p-4 text-center">
                  <div className="font-fraunces text-2xl font-bold">729건</div>
                  <div className="text-[11px] text-[#7A9688] font-mono uppercase mt-1">수집 산림 소재</div>
                </div>
                <div className="bg-[#E8F2FB] border border-[#58AC6E]/12 rounded-xl p-4 text-center">
                  <div className="font-fraunces text-2xl font-bold">0.75</div>
                  <div className="text-[11px] text-[#7A9688] font-mono uppercase mt-1">최고 유사도</div>
                </div>
                <div className="bg-[#E8F2FB] border border-[#58AC6E]/12 rounded-xl p-4 text-center">
                  <div className="font-fraunces text-2xl font-bold">1.39초</div>
                  <div className="text-[11px] text-[#7A9688] font-mono uppercase mt-1">평균 응답 속도</div>
                </div>
              </div>

              {/* 검색 방법 */}
              <div className="space-y-2">
                <h4 className="font-dmmono text-[10px] uppercase text-[#7A9688] tracking-wider">검색 원리</h4>
                <p className="text-[13.5px] leading-relaxed text-[#4A6358] font-light">
                  자연어로 원하시는 효능(예: 항노화, 장벽 개선)이나 목적을 편하게 입력하시면, AI가 문맥의 의미를 파악하여 가장 연관성이 높은 산림 바이오 소재 후보를 유사도 순으로 즉각 큐레이션합니다.
                </p>
              </div>

              {/* 검색 예시 태그 (hi 스타일) */}
              <div className="space-y-2">
                <h4 className="font-dmmono text-[10px] uppercase text-[#7A9688] tracking-wider">추천 검색어</h4>
                <div className="flex flex-wrap gap-2">
                  {['항산화 침엽수 소재', '피부 미백 자생식물', '항균 산림 추출물'].map(tag => (
                    <span key={tag} className="px-3.5 py-1.5 rounded-full bg-[#E0F5E8] border border-[#3A8C54]/30 text-[#3A8C54] font-medium text-xs">
                      {tag}
                    </span>
                  ))}
                  {['보습 강화 소재', '두피 케어 산림식물', '발효 유래 소재'].map(tag => (
                    <span key={tag} className="px-3.5 py-1.5 rounded-full bg-[#E8F2FB] border border-[#DCF0E4] text-[#4A6358] text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* 출처 태그 */}
              <div className="space-y-2">
                <h4 className="font-dmmono text-[10px] uppercase text-[#7A9688] tracking-wider">연동 데이터베이스</h4>
                <div className="flex flex-wrap gap-2">
                  {['약용식물생태정보 534건', '식물정유은행', '바이오소재 95건', 'KNApSAck', 'KEGG'].map(db => (
                    <span key={db} className="px-3 py-1 rounded bg-[#E8F2FB] border border-[#DCF0E4] text-[#4A6358] text-xs font-light">
                      {db}
                    </span>
                  ))}
                </div>
              </div>

              {/* CTA 버튼 */}
              <button 
                onClick={() => { closeModal(); setTimeout(() => openModal('pilot'), 250); }}
                className="w-full py-3.5 bg-[#1B4D32] hover:bg-[#16402A] text-white font-medium text-xs md:text-sm rounded-lg transition-colors flex items-center justify-center gap-2 mt-4 tracking-wide shadow-md shadow-[#1B4D32]/10"
              >
                <span>파일럿 신청하고 직접 사용하기 →</span>
              </button>
            </div>
          )}

          {/* 2) 특허 조회 모달 */}
          {activeModal === 'patent' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* 플로우 차트 */}
              <div className="space-y-2">
                <h4 className="font-dmmono text-[10px] uppercase text-[#7A9688] tracking-wider">특허 선행조사 프로세스</h4>
                <div className="grid grid-cols-4 gap-2 bg-[#E8F2FB] p-3.5 rounded-xl border border-[#DCF0E4] text-center text-xs">
                  <div className="space-y-1">
                    <div className="font-semibold text-[#1B4D32]">1. 카드 생성</div>
                    <div className="text-[10px] text-[#7A9688] font-light">소재 후보 도출</div>
                  </div>
                  <div className="space-y-1 border-l border-[#C8DDD2]">
                    <div className="font-semibold text-[#1B4D32]">2. KIPRIS 호출</div>
                    <div className="text-[10px] text-[#7A9688] font-light">실시간 API 조회</div>
                  </div>
                  <div className="space-y-1 border-l border-[#C8DDD2]">
                    <div className="font-semibold text-[#1B4D32]">3. 배지 갱신</div>
                    <div className="text-[10px] text-[#7A9688] font-light">안전/충돌 판별</div>
                  </div>
                  <div className="space-y-1 border-l border-[#C8DDD2]">
                    <div className="font-semibold text-[#1B4D32]">4. 대안 제안</div>
                    <div className="text-[10px] text-[#7A9688] font-light">유사 성분 자동 추천</div>
                  </div>
                </div>
              </div>

              {/* 배지 종류 */}
              <div className="space-y-2">
                <h4 className="font-dmmono text-[10px] uppercase text-[#7A9688] tracking-wider">실시간 특허 배지 종류</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 rounded-full bg-[#E0F5E8] border border-[#3A8C54]/30 text-[#3A8C54] font-medium text-xs">
                    ✓ 특허 안전 — 관련 선행 특허 없음
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-[#fff3e0] border border-[#ffb74d]/30 text-[#E65100] font-medium text-xs">
                    ⚠ 주의 — 만료 또는 미등록 유사 특허 존재
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-[#fdeaea] border border-[#ef5350]/30 text-[#B71C1C] font-medium text-xs">
                    ✕ 충돌 — 동등 효능의 활성 특허 존재
                  </span>
                </div>
              </div>

              {/* 자동 제안 설명 */}
              <div className="space-y-2">
                <h4 className="font-dmmono text-[10px] uppercase text-[#7A9688] tracking-wider">대안 소재 자동 제안 메커니즘</h4>
                <p className="text-[13.5px] leading-relaxed text-[#4A6358] font-light">
                  특정 식물 소재에서 특허 충돌이 발견될 경우, 처음부터 연구를 다시 시작할 필요가 없습니다. AI가 pgvector를 활용해 동일한 유효 성분이나 효능을 내는 대체 자생 식물 후보 3개를 즉시 선별하여 우회 전략을 마련해 드립니다.
                </p>
              </div>

              {/* 면책 조항 */}
              <div className="pt-4 border-t border-[#C8DDD2]/60 text-xs text-[#7A9688] font-light leading-relaxed">
                ※ 본 시스템의 특허 매칭은 KIPRIS 공개 데이터 기반의 1차 AI 필터링이며, 특허법상 보증 효력을 지니지 않습니다. 상세한 권리 분석은 당사 변리사 파트너 또는 내부 법무팀의 정밀 검토가 요구됩니다.
              </div>
            </div>
          )}

          {/* 3) 리포트 생성 모달 */}
          {activeModal === 'report' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* 리포트 섹션 목록 */}
              <div className="space-y-2">
                <h4 className="font-dmmono text-[10px] uppercase text-[#7A9688] tracking-wider">R&D 제안 리포트 구성 섹션</h4>
                
                <div className="divide-y divide-[#C8DDD2]/45 border border-[#C8DDD2]/50 rounded-xl overflow-hidden text-xs bg-[#E8F2FB]/30">
                  <div className="p-3.5 flex items-start gap-4">
                    <span className="font-mono text-[#3A8C54] font-bold">§1</span>
                    <div>
                      <div className="font-semibold text-[#1B4D32]">소재 개요</div>
                      <div className="text-[#4A6358] mt-0.5 font-light">한글명·학명·자생지·추출부위. PubChem 분자 구조식 자동 매핑</div>
                    </div>
                  </div>
                  <div className="p-3.5 flex items-start gap-4">
                    <span className="font-mono text-[#3A8C54] font-bold">§2</span>
                    <div>
                      <div className="font-semibold text-[#1B4D32]">주요 성분 정보</div>
                      <div className="text-[#4A6358] mt-0.5 font-light">KNApSAck 성분명·CAS No 테이블 표출. KEGG 대사경로·효소 정보 연동</div>
                    </div>
                  </div>
                  <div className="p-3.5 flex items-start gap-4">
                    <span className="font-mono text-[#3A8C54] font-bold">§3</span>
                    <div>
                      <div className="font-semibold text-[#1B4D32]">공공데이터 출처</div>
                      <div className="text-[#4A6358] mt-0.5 font-light">data_source·source_org·수집 기준일 등 공공 출처 명확히 표기</div>
                    </div>
                  </div>
                  <div className="p-3.5 flex items-start gap-4">
                    <span className="font-mono text-[#3A8C54] font-bold">§4</span>
                    <div>
                      <div className="font-semibold text-[#1B4D32]">화장품 원료 적합성</div>
                      <div className="text-[#4A6358] mt-0.5 font-light">식약처 화장품 성분 허용 기준 검토 판별 및 Claude AI 해석 주석 제공</div>
                    </div>
                  </div>
                  <div className="p-3.5 flex items-start gap-4">
                    <span className="font-mono text-[#3A8C54] font-bold">§5</span>
                    <div>
                      <div className="font-semibold text-[#1B4D32]">분양 절차 안내</div>
                      <div className="text-[#4A6358] mt-0.5 font-light">국립산림과학원(NIFoS) 분양 코드 연계 시 분양 신청 절차 자동 인쇄</div>
                    </div>
                  </div>
                  <div className="p-3.5 flex items-start gap-4">
                    <span className="font-mono text-[#3A8C54] font-bold">§6</span>
                    <div>
                      <div className="font-semibold text-[#1B4D32]">다음 단계 타임라인</div>
                      <div className="text-[#4A6358] mt-0.5 font-light">Claude AI가 가용한 성분 정보를 바탕으로 즉시·1~3개월·3~6개월 단위 R&D 플랜 설계</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 공유 방법 */}
              <div className="space-y-2">
                <h4 className="font-dmmono text-[10px] uppercase text-[#7A9688] tracking-wider">공유 및 내보내기 옵션</h4>
                <div className="flex flex-wrap gap-2">
                  {['30일 유효 고유 링크', '로그인 없는 즉시 열람', '브라우저 PDF 내보내기', '연구원/고객사 제안용 2가지 템플릿'].map(opt => (
                    <span key={opt} className="px-3 py-1.5 rounded-full bg-[#E8F2FB] border border-[#DCF0E4] text-[#4A6358] text-xs">
                      {opt}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4) 데이터 소개 모달 */}
          {activeModal === 'data' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* 데이터 요약 카드 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#E8F2FB] border border-[#58AC6E]/12 rounded-xl p-4 text-center">
                  <div className="font-fraunces text-2xl font-bold">729건</div>
                  <div className="text-[11px] text-[#7A9688] font-mono uppercase mt-1">소재 축적</div>
                </div>
                <div className="bg-[#E8F2FB] border border-[#58AC6E]/12 rounded-xl p-4 text-center">
                  <div className="font-fraunces text-2xl font-bold">97.5%</div>
                  <div className="text-[11px] text-[#7A9688] font-mono uppercase mt-1">KNApSAck 매칭</div>
                </div>
                <div className="bg-[#E8F2FB] border border-[#58AC6E]/12 rounded-xl p-4 text-center">
                  <div className="font-fraunces text-2xl font-bold">50.8개</div>
                  <div className="text-[11px] text-[#7A9688] font-mono uppercase mt-1">평균 활성 성분</div>
                </div>
              </div>

              {/* 4-레이어 소개 */}
              <div className="space-y-3.5">
                <h4 className="font-dmmono text-[10px] uppercase text-[#7A9688] tracking-wider">공공데이터 4-레이어 아키텍처</h4>
                
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 bg-white border border-[#DCF0E4] rounded-xl flex gap-3.5 items-start">
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-[#E0F5E8] text-[#1B4D32]">L1</span>
                    <div>
                      <h5 className="font-semibold text-[#1B4D32] text-sm">산림청 · 국립산림과학원 공공데이터</h5>
                      <p className="text-[#4A6358] mt-1 font-light leading-relaxed">약용식물생태정보 534건, 식물정유은행 화학성분 데이터, 추출물 분양코드 데이터 95건 통합 구축.</p>
                    </div>
                  </div>
                  
                  <div className="p-3.5 bg-white border border-[#DCF0E4] rounded-xl flex gap-3.5 items-start">
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-[#eeedfe] text-[#3c3489]">L2</span>
                    <div>
                      <h5 className="font-semibold text-[#3c3489] text-sm">KNApSAck · KEGG 성분 보강</h5>
                      <p className="text-[#4A6358] mt-1 font-light leading-relaxed">학명 조인을 통해 97.5% 매칭 성공. 식물당 성분 50.8개 및 대사 경로(Pathway) 338건, 효소 정보 336건 자동 확충.</p>
                    </div>
                  </div>
                  
                  <div className="p-3.5 bg-white border border-[#DCF0E4] rounded-xl flex gap-3.5 items-start">
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-[#e4edf9] text-[#1a3d6e]">L3</span>
                    <div>
                      <h5 className="font-semibold text-[#1a3d6e] text-sm">식약처 규제 · 특허청 정보</h5>
                      <p className="text-[#4A6358] mt-1 font-light leading-relaxed">식약처 고시 화장품 사용 원료 적합 여부 판별. CAS 번호 기준 KIPRIS 특허 정보 실시간 매핑.</p>
                    </div>
                  </div>
                  
                  <div className="p-3.5 bg-white border border-[#DCF0E4] rounded-xl flex gap-3.5 items-start">
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-[#fdf4dc] text-[#b8671c]">L4</span>
                    <div>
                      <h5 className="font-semibold text-[#b8671c] text-sm">PubChem 실시간 분자 정보</h5>
                      <p className="text-[#4A6358] mt-1 font-light leading-relaxed">성분 리포트 로딩 시 PubChem API를 호출하여 화학 구조식, 분자량, 물리적 특성 및 생물학적 활성 데이터를 실시간 결합.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5) 파일럿 신청 모달 */}
          {activeModal === 'pilot' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {submitResult?.success ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center animate-in zoom-in-95 duration-500">
                  <div className="w-14 h-14 bg-[#1B4D32] text-white rounded-full flex items-center justify-center shadow-lg">
                    <Check className="w-7 h-7 stroke-[3]" />
                  </div>
                  <h4 className="text-xl font-bold text-[#1B4D32]">신청 완료!</h4>
                  <p className="text-sm text-[#4A6358] max-w-sm leading-relaxed font-light">
                    {submitResult.message}
                  </p>
                  <button 
                    onClick={closeModal}
                    className="mt-6 px-6 py-2.5 bg-[#1B4D32] hover:bg-[#16402A] rounded-lg text-xs font-semibold text-white transition-colors"
                  >
                    확인
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePilotSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-semibold text-[#7A9688] uppercase tracking-wider font-mono">이름</label>
                    <input 
                      type="text" 
                      placeholder="이름을 입력해주세요"
                      required
                      value={pilotName}
                      onChange={e => setPilotName(e.target.value)}
                      className="w-full px-4 py-3 bg-[#E8F2FB] border border-[#DCF0E4] focus:border-[#3A8C54] rounded-lg text-[#1B4D32] placeholder-[#7A9688]/60 text-sm focus:outline-none transition-all font-light"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-semibold text-[#7A9688] uppercase tracking-wider font-mono">소속 회사</label>
                    <input 
                      type="text" 
                      placeholder="예: 코스메카코리아"
                      required
                      value={pilotCompany}
                      onChange={e => setPilotCompany(e.target.value)}
                      className="w-full px-4 py-3 bg-[#E8F2FB] border border-[#DCF0E4] focus:border-[#3A8C54] rounded-lg text-[#1B4D32] placeholder-[#7A9688]/60 text-sm focus:outline-none transition-all font-light"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-semibold text-[#7A9688] uppercase tracking-wider font-mono">업무용 이메일</label>
                    <input 
                      type="email" 
                      placeholder="researcher@company.com"
                      required
                      value={pilotEmail}
                      onChange={e => setPilotEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-[#E8F2FB] border border-[#DCF0E4] focus:border-[#3A8C54] rounded-lg text-[#1B4D32] placeholder-[#7A9688]/60 text-sm focus:outline-none transition-all font-light"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-semibold text-[#7A9688] uppercase tracking-wider font-mono">관심 소재 카테고리 (복수 선택)</label>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {CATEGORY_OPTIONS.map(cat => {
                        const isActive = selectedCategories.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className={`px-3 py-2 rounded-full border text-xs font-light transition-all ${
                              isActive
                                ? 'bg-[#E0F5E8] border-[#3A8C54]/30 text-[#3A8C54] font-medium'
                                : 'bg-[#E8F2FB] hover:bg-[#DCF0E4]/60 border-[#DCF0E4] text-[#4A6358]'
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {submitResult && !submitResult.success && (
                    <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-light flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{submitResult.message}</span>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-[#1B4D32] hover:bg-[#16402A] disabled:bg-stone-300 text-white font-semibold text-xs rounded-lg transition-colors tracking-wide mt-6 flex items-center justify-center gap-2 shadow-md shadow-[#1B4D32]/10"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>무료 파일럿 신청하기 →</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
