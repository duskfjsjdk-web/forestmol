'use server';

import { getSupabaseServer } from '@/lib/supabaseServer';
import { cookies } from 'next/headers';

/**
 * 로그인한 사용자의 ID를 안전하게 획득합니다.
 */
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

/**
 * PDF public URL로부터 Supabase Storage 내 상대 파일 경로를 추출합니다.
 */
function getStoragePathFromUrl(url: string): string | null {
  if (!url) return null;
  // public url 형식: https://.../storage/v1/object/public/reports/projects/projectId/filename.pdf
  const marker = '/storage/v1/object/public/reports/';
  const index = url.indexOf(marker);
  if (index !== -1) {
    return decodeURIComponent(url.substring(index + marker.length));
  }
  return null;
}

/**
 * 특정 R&D 제안 리포트를 삭제합니다. 
 * 테이블 행뿐 아니라 연계된 Supabase Storage 내 PDF 파일도 함께 안전하게 정리합니다.
 */
export async function deleteReport(reportId: string) {
  try {
    const supabase = getSupabaseServer();
    const userId = await getUserId(supabase);

    // 1. 삭제할 리포트의 작성자가 본인이 맞는지 식별 및 PDF URL 획득
    const { data: report, error: selectError } = await supabase
      .from('reports')
      .select('id, user_id, pdf_url')
      .eq('id', reportId)
      .single();

    if (selectError || !report) {
      return { success: false, error: '리포트 정보를 찾을 수 없습니다.' };
    }

    if (report.user_id !== userId) {
      return { success: false, error: '본인이 생성한 리포트만 삭제할 권한이 있습니다.' };
    }

    // 2. Supabase Storage 버킷에서 PDF 파일 삭제
    if (report.pdf_url) {
      const storagePath = getStoragePathFromUrl(report.pdf_url);
      if (storagePath) {
        const { error: storageError } = await supabase.storage
          .from('reports')
          .remove([storagePath]);

        if (storageError) {
          console.warn(`⚠️ Supabase Storage 파일 삭제 실패 (${storagePath}):`, storageError.message);
          // 스토리지 파일 삭제 실패가 데이터베이스 데이터 삭제 흐름을 방해하지 않도록 경고만 남깁니다.
        } else {
          console.log(`✅ Supabase Storage 파일 삭제 완료: ${storagePath}`);
        }
      }
    }

    // 3. DB reports 테이블에서 리포트 데이터 삭제
    const { error: deleteError } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId);

    if (deleteError) {
      throw deleteError;
    }

    return { success: true };

  } catch (error: any) {
    console.error('❌ [deleteReport 서버 액션 오류]:', error.message);
    return { success: false, error: error.message || '서버 오류로 리포트 삭제에 실패했습니다.' };
  }
}

/**
 * 여러 R&D 제안 리포트를 한 번에 삭제합니다.
 */
export async function deleteReports(reportIds: string[]) {
  try {
    const supabase = getSupabaseServer();
    const userId = await getUserId(supabase);

    if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
      return { success: false, error: '삭제할 리포트가 지정되지 않았습니다.' };
    }

    // 1. 삭제할 리포트들 조회하여 본인 소유인지 검증 및 PDF URL 추출
    const { data: reports, error: selectError } = await supabase
      .from('reports')
      .select('id, user_id, pdf_url')
      .in('id', reportIds);

    if (selectError || !reports) {
      return { success: false, error: '리포트 정보를 찾을 수 없습니다.' };
    }

    // 작성자 검증
    const invalidOwner = reports.some(r => r.user_id !== userId);
    if (invalidOwner) {
      return { success: false, error: '본인이 작성하지 않은 리포트가 포함되어 있어 삭제할 수 없습니다.' };
    }

    // 2. 스토리지 파일 삭제
    const storagePaths: string[] = [];
    reports.forEach(report => {
      if (report.pdf_url) {
        const path = getStoragePathFromUrl(report.pdf_url);
        if (path) storagePaths.push(path);
      }
    });

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('reports')
        .remove(storagePaths);

      if (storageError) {
        console.warn('⚠️ 다중 삭제 도중 Supabase Storage 일부 파일 삭제 실패:', storageError.message);
      }
    }

    // 3. DB에서 리포트 데이터 삭제
    const { error: deleteError } = await supabase
      .from('reports')
      .delete()
      .in('id', reportIds);

    if (deleteError) {
      throw deleteError;
    }

    return { success: true };

  } catch (error: any) {
    console.error('❌ [deleteReports 서버 액션 오류]:', error.message);
    return { success: false, error: error.message || '서버 오류로 리포트 삭제에 실패했습니다.' };
  }
}
