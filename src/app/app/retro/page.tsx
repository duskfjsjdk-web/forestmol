'use client';

import React from 'react';
import { FlaskConical, AlertTriangle } from 'lucide-react';

// 천연 유기화합물 역합성 탐색실(Retro)의 기본 빈 쉘 화면입니다.
export default function RetroPage() {
  return (
    <div className="p-10 max-w-6xl mx-auto space-y-8 font-sans">
      
      {/* 타이틀 및 헤더 */}
      <div className="flex flex-col gap-1.5 border-b border-stone-200 pb-5">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-[#2D5016]" />
          <h1 className="text-2xl font-bold text-stone-900">역합성 분석</h1>
        </div>
        <p className="text-sm text-stone-500 font-medium">
          천연물 속의 핵심 화합물 성분을 합성 및 정제할 수 있는 최적의 경로를 분석하고 설계합니다.
        </p>
      </div>

      {/* 준비 중 안내판 */}
      <div className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-[#2D5016]/10 flex items-center justify-center text-[#2D5016] mb-5">
          <FlaskConical className="w-8 h-8" />
        </div>
        
        <h2 className="text-xl font-bold text-stone-900 mb-2">역합성 분석실 준비 중</h2>
        <p className="text-sm text-stone-500 max-w-md mb-6 leading-relaxed">
          화학 화합물의 합성을 위한 촉매 반응 및 화학 분자 구조 분석 모듈이 연동되고 있습니다.<br />
          소재 탐색실 구축 완료 이후 2차 릴리즈 버전에서 찾아뵙겠습니다.
        </p>
        
        <div className="flex items-center gap-2 text-xs font-semibold text-[#2D5016] bg-[#2D5016]/10 px-4 py-2 rounded-full">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>안내: 소재 탐색 기능 고도화 이후 개발 예정</span>
        </div>
      </div>
    </div>
  );
}
