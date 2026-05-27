'use client';

import React from 'react';
import { Printer } from 'lucide-react';
import Link from 'next/link';

interface PrintHeaderProps {
  projectName: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({ projectName }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <header className="no-print sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-stone-200 py-3.5 px-6 sm:px-10 flex items-center justify-between shadow-sm">
      {/* 좌측 로고 및 프로젝트명 */}
      <div className="flex items-center gap-3">
        <Link 
          href="/" 
          className="font-mono font-extrabold tracking-widest text-base text-[#2D5016] hover:opacity-80 transition-opacity"
        >
          FORESTMOL
        </Link>
        <span className="text-stone-300">|</span>
        <span className="text-xs font-bold text-stone-600 truncate max-w-[180px] sm:max-w-[360px]">
          {projectName}
        </span>
      </div>

      {/* 우측 인쇄 버튼 */}
      <button
        onClick={handlePrint}
        className="flex items-center justify-center gap-1.5 py-2 px-4 bg-[#2D5016] hover:bg-[#203a10] text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-[#2D5016]/10 cursor-pointer"
      >
        <Printer className="w-3.5 h-3.5" />
        <span>인쇄 / PDF 저장</span>
      </button>
    </header>
  );
};
