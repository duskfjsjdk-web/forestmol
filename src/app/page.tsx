"use client";

import React, { useEffect } from 'react';
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import QuickLinkBar from '@/components/landing/QuickLinkBar';
import LandingInfo from '@/components/landing/LandingInfo';
import { ModalProvider, useModal } from '@/components/landing/ModalSystem';

function MainLandingContent() {
  const { openModal } = useModal();

  // 스크롤 Reveal 애니메이션 감지
  useEffect(() => {
    const revealEls = document.querySelectorAll('.rv');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('on');
        }
      });
    }, { threshold: 0.1 });

    revealEls.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="min-h-screen bg-[#FAF7F0] font-dmsans text-stone-800">
      
      {/* 네비게이션 및 히어로 퀵링크 통합 영역 */}
      <div className="relative h-screen min-h-[700px]">
        <Navbar />
        <Hero />
        <QuickLinkBar />
      </div>

      {/* 랜딩 정보 섹션 (작동 원리, 비교 분석, 차별화 강점) */}
      <LandingInfo />

      {/* 푸터 영역 */}
      <footer className="bg-[#16402a] text-stone-400 py-16 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#2D5016] flex items-center justify-center">
              <span className="text-white font-bold font-fraunces">F</span>
            </div>
            <span className="text-white font-black tracking-tight">ForestMol</span>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-6 text-xs text-stone-500">
            <span className="hover:text-stone-300 transition-colors cursor-pointer">서비스 이용약관</span>
            <span className="hover:text-stone-300 transition-colors cursor-pointer">개인정보 처리방침</span>
            <span>© {new Date().getFullYear()} ForestMol. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default function Home() {
  return (
    <ModalProvider>
      <MainLandingContent />
    </ModalProvider>
  );
}