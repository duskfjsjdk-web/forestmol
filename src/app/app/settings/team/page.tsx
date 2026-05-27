'use client';

import React from 'react';
import { Users, AlertTriangle } from 'lucide-react';

// 팀 관리 페이지의 기본 빈 쉘 화면입니다.
export default function TeamSettingsPage() {
  return (
    <div className="p-10 max-w-6xl mx-auto space-y-8 font-sans">

      {/* 타이틀 및 헤더 */}
      <div className="flex flex-col gap-1.5 border-b border-stone-200 pb-5">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-[#2D5016]" />
          <h1 className="text-2xl font-bold text-stone-900">팀 관리</h1>
        </div>
        <p className="text-sm text-stone-500 font-medium">
          연구팀 멤버를 초대하고 접근 권한을 관리합니다.
        </p>
      </div>

      {/* 준비 중 안내판 */}
      <div className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-[#2D5016]/10 flex items-center justify-center text-[#2D5016] mb-5">
          <Users className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-stone-900 mb-2">팀 관리 기능 준비 중</h2>
        <p className="text-sm text-stone-500 max-w-md mb-6 leading-relaxed">
          멤버 초대, 역할(Role) 설정, 프로젝트 접근 권한 관리 기능이<br />
          곧 제공될 예정입니다.
        </p>

        <div className="flex items-center gap-2 text-xs font-semibold text-[#2D5016] bg-[#2D5016]/10 px-4 py-2 rounded-full">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>안내: 소재 탐색 및 리포트 기능 완성 이후 순차 출시 예정</span>
        </div>
      </div>
    </div>
  );
}
