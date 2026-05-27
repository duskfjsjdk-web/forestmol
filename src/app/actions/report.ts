'use server';

import { getSupabaseServer } from '@/lib/supabaseServer';
import { cookies } from 'next/headers';

// ─────────────────────────────────────────────
// 로그인 유저 식별 보조 도구
// ─────────────────────────────────────────────
async function getUserId(supabase: any): Promise<string> {
  const token = cookies().get('forestmol-token')?.value;
  if (!token) {
    throw new Error('인증 세션이 존재하지 않습니다. 다시 로그인해 주세요.');
  }
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    throw new Error('인증 세션이 유효하지 않습니다. 다시 로그인해 주세요.');
  }
  return user.id;
}

// ─────────────────────────────────────────────
// 1. 생성된 모든 PDF 리포트 목록 조회
// ─────────────────────────────────────────────
export async function getReports() {
  try {
    const supabase = getSupabaseServer();
    const userId = await getUserId(supabase);

    // 로그인한 연구원이 생성한 모든 리포트 목록과 조인된 프로젝트 정보, 
    // 그리고 프로젝트별 소재 개수(count)를 일괄 조회합니다.
    const { data, error } = await supabase
      .from('reports')
      .select('*, projects(*, project_materials(count))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((r: any) => ({
      id: r.id,
      title: r.title || '소재 제안 리포트',
      pdfUrl: r.pdf_url,
      shareToken: r.share_token,
      expiresAt: r.expires_at,
      createdAt: r.created_at,
      projectName: r.projects?.name || '삭제된 프로젝트',
      clientName: r.projects?.client_name || '미지정',
      materialCount: r.projects?.project_materials?.[0]?.count ?? 0,
    }));

  } catch (error: any) {
    console.error('❌ [Report Action] 리포트 목록 조회 실패:', error.message);
    return [];
  }
}
