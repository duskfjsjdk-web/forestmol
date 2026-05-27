"use client";

import React from 'react';
import { Search, Lock, FileText, Database, User } from 'lucide-react';
import { useModal } from './ModalSystem';

export default function QuickLinkBar() {
  const { openModal } = useModal();

  const links = [
    {
      id: 'search',
      title: '소재 탐색',
      desc: '자연어 AI 검색',
      icon: Search,
      action: () => openModal('search'),
      isSpecial: false
    },
    {
      id: 'patent',
      title: '특허 조회',
      desc: 'KIPRIS 자동화',
      icon: Lock,
      action: () => openModal('patent'),
      isSpecial: false
    },
    {
      id: 'report',
      title: '리포트 생성',
      desc: 'AI 해석 포함',
      icon: FileText,
      action: () => openModal('report'),
      isSpecial: false
    },
    {
      id: 'data',
      title: '데이터 소개',
      desc: '공공데이터 4레이어',
      icon: Database,
      action: () => openModal('data'),
      isSpecial: false
    },
    {
      id: 'pilot',
      title: '파일럿 신청',
      desc: '무료 샘플 리포트',
      icon: User,
      action: () => openModal('pilot'),
      isSpecial: true
    }
  ];

  return (
    <div 
      className="relative z-10 h-24 bg-[#E0F5E8]/88 backdrop-blur-[20px] saturate-[150%] border-b border-t border-[#96D2AF]/60 flex items-stretch select-none"
    >
      {links.map((link, idx) => {
        const Icon = link.icon;
        return (
          <button
            key={link.id}
            onClick={link.action}
            className={`flex-1 flex flex-col lg:flex-row items-center justify-center gap-3 px-4 border-r border-[#50B478]/12 hover:bg-[#50B478]/7 transition-all text-center group ${
              idx === links.length - 1 ? 'border-r-0' : ''
            } ${
              link.isSpecial ? 'bg-[#2D6B3C]/10' : ''
            }`}
          >
            {/* 아이콘 */}
            <div className="w-8 h-8 rounded bg-[#1B4D32]/10 flex items-center justify-center shrink-0">
              <Icon className="w-3.5 h-3.5 text-[#1B4D32]/55" strokeWidth={1.8} />
            </div>
            
            {/* 텍스트 */}
            <div className="hidden lg:block text-left">
              <div 
                className={`text-[14.5px] font-semibold leading-none mb-1.5 ${
                  link.isSpecial ? 'text-[#1E5032]' : 'text-[#123A24]'
                }`}
              >
                {link.title}
              </div>
              <div className="text-[12px] text-[#286441]/55 leading-none">
                {link.desc}
              </div>
            </div>
            
            {/* 모바일 텍스트 (단순화) */}
            <div className="lg:hidden block text-center">
              <div 
                className={`text-sm font-semibold leading-none ${
                  link.isSpecial ? 'text-[#1E5032]' : 'text-[#123A24]'
                }`}
              >
                {link.title}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
