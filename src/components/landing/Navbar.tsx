"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useModal } from './ModalSystem';

export default function Navbar() {
  const { openModal } = useModal();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav 
      className="fixed top-0 left-0 right-0 z-[200] transition-all duration-300 px-6 md:px-14 py-[22px] flex items-center justify-between"
      style={{
        background: scrolled 
          ? 'rgba(22,64,42,.95)' 
          : 'linear-gradient(to bottom, rgba(0,0,0,.52) 0%, rgba(0,0,0,0) 100%)',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,.1)' : '1px solid #ffffff',
      }}
    >
      {/* 로고 */}
      <Link href="/" style={{ fontSize: '21px', color: '#ffffff' }} className="font-fraunces font-bold tracking-tight flex items-center gap-2 select-none">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--sage2)]"></span>
        <span>ForestMol</span>
      </Link>
      
      {/* 중앙 메뉴 링크 */}
      <ul className="hidden md:flex items-center gap-10">
        <li>
          <a 
            href="#features" 
            style={{ 
              color: 'rgba(255,255,255,.88)', 
              fontSize: '15px', 
              fontWeight: 400, 
              letterSpacing: '0.05em', 
              textDecoration: 'none',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,.88)'}
          >
            기능
          </a>
        </li>
        <li>
          <a 
            href="#pipeline" 
            style={{ 
              color: 'rgba(255,255,255,.88)', 
              fontSize: '15px', 
              fontWeight: 400, 
              letterSpacing: '0.05em', 
              textDecoration: 'none',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,.88)'}
          >
            데이터
          </a>
        </li>
        <li>
          <a 
            href="#how" 
            style={{ 
              color: 'rgba(255,255,255,.88)', 
              fontSize: '15px', 
              fontWeight: 400, 
              letterSpacing: '0.05em', 
              textDecoration: 'none',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,.88)'}
          >
            사용법
          </a>
        </li>
      </ul>

      {/* CTA 버튼 */}
      <div className="flex items-center gap-2">
        <Link 
          href="/login"
          style={{
            color: 'rgba(255,255,255,.75)',
            fontSize: '15px',
            fontWeight: 400,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '9px 16px',
            textDecoration: 'none',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,.75)';
          }}
        >
          로그인
        </Link>
        <button 
          onClick={() => openModal('pilot')}
          className="transition-all duration-200 select-none"
          style={{
            background: 'rgba(255,255,255,.18)',
            border: '1.5px solid rgba(255,255,255,.6)',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 500,
            padding: '9px 22px',
            borderRadius: '8px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,.18)';
          }}
        >
          파일럿 신청
        </button>
      </div>
    </nav>
  );
}
