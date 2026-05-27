'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data?.session) {
        const res = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
          }),
        });

        if (!res.ok) {
          throw new Error('인증 세션 발급에 실패했습니다. 관리자에게 문의해 주세요.');
        }

        router.push('/app/search');
        router.refresh();
      }
    } catch (err: any) {
      console.error('❌ 로그인 오류:', err);
      let friendlyMessage = '로그인 중 문제가 발생했습니다.';
      if (err.message?.includes('Invalid login credentials')) {
        friendlyMessage = '등록되지 않은 이메일이거나, 비밀번호가 일치하지 않습니다.';
      } else {
        friendlyMessage = err.message || friendlyMessage;
      }
      setErrorMsg(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* 🌲 입체적인 안개 속 숲 감성의 프리미엄 광원 블러 데코레이션 */}
      <div className="absolute top-[-15%] left-[-15%] w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none animate-[pulse_12s_infinite]" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[600px] h-[600px] rounded-full bg-[#2D5016]/15 blur-[160px] pointer-events-none" />
      <div className="absolute top-[35%] right-[20%] w-[350px] h-[350px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* 미세 격자선 디자인으로 테크니컬한 고급스러움 가미 */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(45,80,22,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(45,80,22,0.012)_1px,transparent_1px)] bg-[size:40px_40px] -z-10"></div>

      <div className="w-full max-w-md bg-white/75 backdrop-blur-xl rounded-3xl p-10 sm:p-12 border border-white/60 shadow-2xl shadow-stone-300/40 z-10 relative">
        {/* 상단 포인트 라인 */}
        <div className="absolute top-0 left-12 right-12 h-1 bg-gradient-to-r from-emerald-500/60 via-[#2D5016] to-teal-500/60 rounded-full"></div>

        {/* 로고 영역 */}
        <div className="flex flex-col items-center text-center mb-10">
          <Link href="/" className="flex flex-col items-center group cursor-pointer">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2D5016] to-[#1E350F] flex items-center justify-center shadow-lg shadow-[#2D5016]/25 mb-4 transition-transform group-hover:scale-105 duration-300">
              <svg className="w-8 h-8 text-[#FAF7F0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-black text-3xl tracking-tight text-stone-900 group-hover:text-[#2D5016] transition-colors">ForestMol</span>
              <span className="text-[9px] font-black bg-[#2D5016]/10 text-[#2D5016] border border-[#2D5016]/20 px-2 py-0.5 rounded-md tracking-wider uppercase">
                R&D Tool
              </span>
            </div>
          </Link>
          
          <p className="text-stone-500 text-xs sm:text-sm mt-3 font-semibold">
            산림 천연 소재 데이터 기반 AI 연구원 플랫폼
          </p>
        </div>

        {/* 에러 피드백 경고창 */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-bold flex items-start gap-2 animate-[shake_0.5s_ease-in-out]">
            <span className="shrink-0">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 로그인 인풋 양식 */}
        <form onSubmit={handleLogin} className="space-y-6">
          
          {/* 이메일 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-600 block pl-1">
              이메일 주소
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400 group-focus-within:text-[#2D5016] transition-colors">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="researcher@company.com"
                className="w-full pl-12 pr-4 py-3.5 bg-stone-50/50 border border-stone-200/80 rounded-2xl text-stone-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2D5016]/25 focus:border-[#2D5016] focus:bg-white transition-all shadow-inner"
              />
            </div>
          </div>

          {/* 비밀번호 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-600 block pl-1">
              비밀번호
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400 group-focus-within:text-[#2D5016] transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3.5 bg-stone-50/50 border border-stone-200/80 rounded-2xl text-stone-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2D5016]/25 focus:border-[#2D5016] focus:bg-white transition-all shadow-inner"
              />
            </div>
          </div>

          {/* 로그인 진행 및 제출 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-13 bg-gradient-to-r from-[#2D5016] to-[#1E350F] hover:from-[#1E350F] hover:to-[#122009] disabled:bg-stone-300 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-[#2D5016]/15 hover:shadow-xl hover:shadow-[#2D5016]/25 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 group mt-8"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>연구실 보안 세션 확인 중...</span>
              </>
            ) : (
              <>
                <span>로그인 및 연구실 입장</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        {/* 파일럿 안내 링크 */}
        <div className="mt-10 text-center space-y-4">
          <div className="text-xs text-stone-400 font-bold">
            아직 연구실 계정이 없으신가요?{' '}
            <Link
              href="/"
              className="text-[#2D5016] font-bold hover:underline inline-flex items-center gap-0.5 transition-colors"
            >
              파일럿 신청하러 가기
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="text-[10px] text-stone-400/80 font-medium">
            © {new Date().getFullYear()} ForestMol. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
