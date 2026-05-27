'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Search, FlaskConical, Folder, FileText, Users, LogOut, Loader2 } from 'lucide-react';

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
}

// 연구원 전용 대시보드 내부의 공통 액자(사이드바 레이아웃)입니다.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // 로그인한 연구원의 정보(이메일 등)를 저장하는 곳입니다.
  const [userEmail, setUserEmail] = useState<string>('연구원');
  const [checkingAuth, setCheckingAuth] = useState(true);

  // 사이드바에 들어갈 메뉴 목록 정의
  const menuItems: MenuItem[] = [
    { name: '소재 탐색', href: '/app/search', icon: Search },
    { name: '역합성', href: '/app/retro', icon: FlaskConical },
    { name: '프로젝트', href: '/app/projects', icon: Folder },
    { name: '리포트', href: '/app/reports', icon: FileText },
    { name: '팀 관리', href: '/app/settings/team', icon: Users },
  ];

  useEffect(() => {
    // 1. 마운트 시점에 현재 접속한 사용자의 세션 정보를 Supabase에서 확인해옵니다.
    const getUserSession = async () => {
      // 2초 타임아웃 안전장치: 네트워크가 먹통이거나 환경 변수가 꼬여 응답이 없을 경우 강제로 로딩을 해제합니다.
      const timeoutId = setTimeout(() => {
        console.warn('⚠️ Supabase 세션 조회 타임아웃 - 강제 로딩 해제');
        setCheckingAuth(false);
      }, 2000);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          // 이메일에서 ID 부분만 잘라내거나 전체 이메일을 보여줍니다.
          setUserEmail(session.user.email);
        }
      } catch (err) {
        console.error('사용자 세션 조회 실패:', err);
      } finally {
        clearTimeout(timeoutId);
        setCheckingAuth(false);
      }
    };

    getUserSession();

    // 로그인 상태가 변하는지 귀를 기울여 감시합니다 (로그아웃 등 감지)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 로그아웃 버튼을 눌렀을 때의 동작 흐름
  const handleLogout = async () => {
    try {
      // 1. Supabase 로그아웃을 수행합니다.
      await supabase.auth.signOut();

      // 2. 수위실(/api/auth/session)에 요청하여 브라우저의 통행증(쿠키)을 지웁니다.
      await fetch('/api/auth/session', { method: 'DELETE' });

      // 3. 다시 대문(로그인 페이지)으로 튕겨냅니다.
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('로그아웃 중 오류:', err);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#2D5016] animate-spin" />
          <span className="text-sm font-semibold text-stone-600">인증 세션을 확인 중입니다...</span>
        </div>
      </div>
    );
  }

  // 이메일 주소의 앞부분만 가져와서 보기 좋게 가공합니다 (예: researcher@domain.com -> researcher)
  const researcherName = userEmail.split('@')[0];

  return (
    <div className="min-h-screen bg-[#FAF7F0] flex font-sans text-stone-800">
      
      {/* 220px 너비의 짙은 우드/다크 포레스트 톤(#1A1710) 사이드바 */}
      <aside className="w-[220px] bg-[#1A1710] text-stone-300 flex flex-col justify-between border-r border-[#2d281d] fixed top-0 bottom-0 left-0 z-20">
        
        {/* 상단 로고 영역 */}
        <div>
          <Link
            href="/app/search"
            className="p-6 border-b border-[#2d281d] flex items-center gap-2.5 hover:bg-white/[0.03] transition-colors block cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-[#2D5016] flex items-center justify-center shadow-md shadow-[#2D5016]/10">
              <svg className="w-4 h-4 text-[#FAF7F0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight text-white">ForestMol</span>
          </Link>

          {/* 중앙 네비게이션 메뉴 목록 */}
          <nav className="py-6 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              // 현재 경로가 메뉴의 경로로 시작하는지 체크하여 활성화 상태를 알아냅니다.
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3.5 px-6 py-3.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'text-white bg-white/5 border-l-4 border-[#2D5016] pl-[20px]' // 활성화 시 왼쪽 초록 테두리와 밝은 폰트
                      : 'text-stone-400 hover:text-stone-200 hover:bg-white/[0.02] border-l-4 border-transparent'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 transition-colors ${isActive ? 'text-[#2D5016]' : 'text-stone-500 group-hover:text-stone-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* 하단 프로필 및 로그아웃 영역 */}
        <div className="p-4 border-t border-[#2d281d] bg-[#15120c]">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate" title={userEmail}>
                {researcherName} 연구원
              </span>
              <span className="text-[10px] text-stone-500 truncate mt-0.5">
                {userEmail}
              </span>
            </div>
            {/* Pro 뱃지 */}
            <span className="text-[9px] font-black bg-[#2D5016]/20 text-[#2D5016] border border-[#2D5016]/40 px-1.5 py-0.5 rounded-md shrink-0 uppercase tracking-wide">
              Pro
            </span>
          </div>

          {/* 로그아웃 버튼 */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-stone-800 hover:bg-stone-700/80 active:bg-stone-800 text-stone-300 hover:text-white rounded-xl text-xs font-medium transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>로그아웃</span>
          </button>
        </div>
      </aside>

      {/* 메인 콘텐츠 영역 (사이드바 220px 확보를 위한 여백 설정) */}
      <main className="flex-1 min-h-screen pl-[220px] relative z-10">
        {children}
      </main>
    </div>
  );
}
