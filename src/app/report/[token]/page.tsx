import React from 'react';
import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { PrintHeader } from '@/components/reports/PrintHeader';

export const dynamic = 'force-dynamic';

interface ReportPageProps {
  params: {
    token: string;
  };
}

export default async function ReportPage({ params }: ReportPageProps) {
  const token = params.token;

  const supabase = getSupabaseAdmin();
  
  // share_token을 기반으로 리포트 내역 및 조인된 프로젝트 정보 조회
  const { data: report, error } = await supabase
    .from('reports')
    .select('*, projects(*)')
    .eq('share_token', token)
    .single();

  // 1. 리포트가 존재하지 않거나 에러 발생 시
  if (error || !report) {
    return <InvalidLinkMessage reason="리포트 데이터를 찾을 수 없거나 올바르지 않은 주소입니다." />;
  }

  // 2. 만료일(30일) 체크
  const expiresAt = report.expires_at ? new Date(report.expires_at) : null;
  const now = new Date();
  const isExpired = expiresAt ? now > expiresAt : false;

  if (isExpired) {
    return <InvalidLinkMessage reason="이 보고서 공유 링크는 생성된 지 30일이 지나 만료되었습니다." />;
  }

  const project = report.projects;

  return (
    <div className="min-h-screen bg-[#FAF7F0] flex flex-col font-sans">
      {/* 상단 인쇄용 헤더 제어 바 (인쇄 시 no-print 클래스로 자동 가림 처리) */}
      <PrintHeader projectName={project?.name || '소재 제안 리포트'} />

      {/* 리포트 본문 콘텐츠 삽입 */}
      <main className="flex-1 w-full">
        {report.html_content ? (
          <div dangerouslySetInnerHTML={{ __html: report.html_content }} />
        ) : (
          <div className="max-w-md mx-auto my-20 p-8 bg-white border border-stone-200 rounded-3xl text-center shadow-sm">
            <p className="text-xs font-bold text-stone-500">리포트 내용이 비어있습니다.</p>
          </div>
        )}
      </main>
    </div>
  );
}

// 링크 만료 또는 존재하지 않음 시 출력할 오류 메시지 컴포넌트
function InvalidLinkMessage({ reason }: { reason: string }) {
  return (
    <div className="min-h-screen bg-[#FAF7F0] flex flex-col justify-between font-sans">
      <header className="bg-white border-b border-stone-200 py-4 px-6 sm:px-10">
        <span className="font-mono font-extrabold tracking-widest text-lg text-[#2D5016]">FORESTMOL</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="bg-white border border-stone-200 rounded-3xl p-8 shadow-md flex flex-col items-center justify-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 animate-pulse">
            <ShieldAlert className="w-8 h-8" />
          </div>
          
          <div className="space-y-1.5">
            <h2 className="font-extrabold text-stone-900 text-sm">공유 링크가 비활성화되었습니다</h2>
            <p className="text-xs text-stone-400 leading-relaxed">
              {reason}
            </p>
          </div>

          <div className="pt-4 w-full">
            <Link
              href="/"
              className="w-full inline-flex items-center justify-center gap-1.5 py-3.5 bg-[#2D5016] hover:bg-[#203a10] text-white font-bold text-xs rounded-2xl transition-all shadow-md shadow-[#2D5016]/10"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ForestMol 홈으로 가기</span>
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-6 border-t border-stone-200 bg-white text-center text-[10px] text-stone-400 font-medium">
        © ForestMol AI - Material Discovery
      </footer>
    </div>
  );
}
