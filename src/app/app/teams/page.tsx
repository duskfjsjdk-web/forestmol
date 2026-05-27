'use client';

import React from 'react';
import { Users, UserPlus } from 'lucide-react';

// 공동 연구팀 관리 공간(Teams)의 기본 빈 쉘 화면입니다.
export default function TeamsPage() {
  return (
    <div className="p-10 max-w-6xl mx-auto space-y-8 font-sans">
      
      {/* 타이틀 및 헤더 */}
      <div className="flex flex-col gap-1.5 border-b border-stone-200 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-[#2D5016]" />
            <h1 className="text-2xl font-bold text-stone-900">팀 관리</h1>
          </div>
          
          {/* 팀원 초대 버튼 */}
          <button className="flex items-center gap-1.5 px-4 py-2 bg-[#2D5016] text-white hover:bg-[#203a10] active:scale-95 text-xs font-semibold rounded-xl shadow-md shadow-[#2D5016]/10 transition-all">
            <UserPlus className="w-4 h-4" />
            <span>새로운 연구원 초대</span>
          </button>
        </div>
        <p className="text-sm text-stone-500 font-medium">
          소재 탐색 프로젝트를 함께 검토하고 기획안을 공유할 연구팀 멤버들을 관리합니다.
        </p>
      </div>

      {/* 팀원 준비 중 안내 */}
      <div className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-[#2D5016]/10 flex items-center justify-center text-[#2D5016] mb-5">
          <Users className="w-8 h-8" />
        </div>
        
        <h2 className="text-xl font-bold text-stone-900 mb-2">등록된 공동 연구원이 없습니다</h2>
        <p className="text-sm text-stone-500 max-w-md mb-6 leading-relaxed">
          동료 연구원을 초대하여 화장품 ODM 신소재 추천 리포트를 함께 편집하고<br />
          더욱 빠르게 거래처 제안서를 피드백받아 보세요.
        </p>
      </div>
    </div>
  );
}
