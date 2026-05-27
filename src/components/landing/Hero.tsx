"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useModal } from './ModalSystem';

export default function Hero() {
  const { openModal } = useModal();
  const statsRef = useRef<HTMLDivElement>(null);
  
  // 지표 애니메이션 상태
  const [count729, setCount729] = useState(0);
  const [count975, setCount975] = useState(0);
  const [count508, setCount508] = useState(0);
  const [count139, setCount139] = useState(0);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const observerTarget = statsRef.current;
    if (!observerTarget) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !animated) {
          setAnimated(true);
          
          // easeOutCubic 카운터 애니메이션 시작
          animateValue(0, 729, 1600, (v) => setCount729(Math.floor(v)));
          animateValue(0, 975, 1600, (v) => setCount975(v / 10));
          animateValue(0, 508, 1600, (v) => setCount508(v / 10));
          animateValue(0, 139, 1600, (v) => setCount139(v / 100));
          
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    observer.observe(observerTarget);
    return () => {
      if (observerTarget) observer.unobserve(observerTarget);
    };
  }, [animated]);

  const animateValue = (start: number, end: number, duration: number, callback: (v: number) => void) => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = ease * (end - start) + start;
      callback(current);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  };

  return (
    <section id="hero" className="relative h-[82vh] min-h-[580px] flex flex-col justify-end overflow-hidden group select-none">
      
      {/* [레이어 1] 배경 이미지 (z-index: 0) — 로컬 이미지 사용 */}
      <div 
        className="absolute inset-0 z-0 transition-transform duration-[10000ms] ease-out scale-[1.04] group-hover:scale-100"
        style={{
          backgroundImage: `url('/images/lovable_forest_hero.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 35%',
          filter: 'brightness(1.12)',
        }}
      />

      {/* [레이어 2] 그라디언트 오버레이 — 하단 텍스트 가독성을 위해 강화된 그라디언트 */}
      <div 
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, rgba(10,20,15,.22) 0%, rgba(10,20,15,.05) 28%, rgba(0,0,0,.48) 60%, rgba(0,0,0,.72) 100%)`
        }}
      />
      
      {/* [레이어 3] 노이즈 그레인 (z-index: 2, opacity: .18) */}
      <div 
        className="absolute inset-0 opacity-[0.18] z-[2] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`
        }}
      />

      {/* [레이어 4] 텍스트 영역 (z-index: 3) */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-14 pb-[112px] flex flex-col justify-end">
        <div className="space-y-6 max-w-[720px]">
          
          {/* Eyebrow */}
          <div style={{ color: '#ffffff', opacity: 0.95, textShadow: '0 1px 8px rgba(0,0,0,0.6)' }} className="flex items-center gap-3 text-sm md:text-base tracking-[0.24em] uppercase font-dmmono font-medium">
            <span className="w-[36px] h-[2px] bg-white/80"></span>
            <span>산림 바이오소재 AI 큐레이션 플랫폼</span>
          </div>

          {/* H1 Title */}
          <h1 
            style={{ 
              fontSize: 'clamp(62px, 7.8vw, 98px)',
              textShadow: '0 2px 24px rgba(0,0,0,.55), 0 1px 6px rgba(0,0,0,.4)'
            }} 
            className="font-fraunces font-light leading-[1.04] tracking-tight text-white"
          >
            소재 탐색에<br />
            <span style={{ color: '#ffffff', textShadow: '0 2px 20px rgba(0,0,0,.6)' }} className="italic font-normal">수개월이</span><br />
            걸립니까.
          </h1>

          {/* Description */}
          <p className="text-base sm:text-lg text-white font-light leading-[1.8] max-w-[500px] drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" style={{ opacity: 0.9 }}>
            산림청·NIFoS 공공데이터 729건과 KNApSAck·KEGG를 AI로 통합. 소재 후보부터 특허 검증, 리포트까지 당일 완성.
          </p>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button 
              onClick={() => openModal('pilot')}
              className="px-7 py-[15px] bg-[rgba(255,255,255,.95)] hover:bg-white text-[#1B4D32] font-medium text-[15px] rounded-[8px] transition-all hover:-translate-y-[1px] hover:shadow-lg hover:shadow-white/5 select-none"
            >
              무료 파일럿 신청
            </button>
            <a 
              href="#features" 
              className="px-7 py-[15px] text-white font-medium text-[15px] rounded-[8px] transition-all duration-200 select-none flex items-center justify-center"
              style={{
                background: 'rgba(0,0,0,.35)',
                border: '1.5px solid rgba(255,255,255,.6)',
                backdropFilter: 'blur(8px)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0,0,0,.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0,0,0,.35)';
              }}
            >
              기능 살펴보기
            </a>
          </div>

          {/* 통계 바 */}
          <div 
            ref={statsRef} 
            className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 border-t border-white/20 pt-[28px] mt-[52px] max-w-2xl w-full text-center"
          >
            <div>
              <div 
                className="font-fraunces text-[28px] font-bold text-white leading-none mb-1.5"
                style={{ textShadow: '0 1px 10px rgba(0,0,0,.5)' }}
                data-count="729"
              >
                {count729}
              </div>
              <div className="text-[11px] text-white font-medium">수집 산림 소재</div>
            </div>
            
            <div className="border-l border-white/20 pl-4 md:border-l md:pl-4">
              <div 
                className="font-fraunces text-[28px] font-bold text-white leading-none mb-1.5"
                style={{ textShadow: '0 1px 10px rgba(0,0,0,.5)' }}
                data-count="975"
                data-suf="%"
              >
                {count975.toFixed(1)}%
              </div>
              <div className="text-[11px] text-white font-medium">KNApSAck 조인율</div>
            </div>

            <div className="border-t border-white/20 pt-4 md:pt-0 md:border-t-0 md:border-l border-white/20 pl-4">
              <div 
                className="font-fraunces text-[28px] font-bold text-white leading-none mb-1.5"
                style={{ textShadow: '0 1px 10px rgba(0,0,0,.5)' }}
              >
                {count508.toFixed(1)}개
              </div>
              <div className="text-[11px] text-white font-medium">식물당 평균 성분</div>
            </div>

            <div className="border-l border-white/20 pl-4 border-t border-white/20 pt-4 md:pt-0 md:border-t-0">
              <div 
                className="font-fraunces text-[28px] font-bold text-white leading-none mb-1.5"
                style={{ textShadow: '0 1px 10px rgba(0,0,0,.5)' }}
              >
                {count139.toFixed(2)}초
              </div>
              <div className="text-[11px] text-white font-medium">평균 응답 시간</div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
