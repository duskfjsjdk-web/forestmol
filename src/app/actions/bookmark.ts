'use server';

import { getSupabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

// ─────────────────────────────────────────────
// 로그인 유저 획득 보조 함수
// ─────────────────────────────────────────────
async function getUserId(supabase: any): Promise<string> {
  const token = cookies().get('forestmol-token')?.value;
  if (!token) {
    throw new Error('인증 세션이 존재하지 않습니다. 다시 로그인해 주세요.');
  }
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    throw new Error(`인증 세션이 유효하지 않습니다 (상세 오류: ${error?.message || '사용자 정보 없음'}). 다시 로그인해 주세요.`);
  }
  return user.id;
}

// ─────────────────────────────────────────────
// 북마크 토글 (담기 / 해제) 서버 액션
// ─────────────────────────────────────────────
export async function toggleBookmark(materialId: string, materialName: string) {
  try {
    const supabase = getSupabaseServer();
    const userId = await getUserId(supabase);

    // 1. 이미 북마크가 되어 있는지 조회합니다.
    const { data: existing, error: selectError } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('material_id', materialId)
      .maybeSingle();

    if (selectError) throw selectError;

    if (existing) {
      // 2. 이미 존재하면 삭제(북마크 해제)합니다.
      const { error: deleteError } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', existing.id);

      if (deleteError) throw deleteError;

      return { success: true, bookmarked: false };
    } else {
      // 3. 없으면 삽입(북마크 등록)합니다.
      const { error: insertError } = await supabase
        .from('bookmarks')
        .insert({
          user_id: userId,
          material_id: materialId,
          material_name: materialName,
        });

      if (insertError) throw insertError;

      return { success: true, bookmarked: true };
    }
  } catch (error: any) {
    console.error('❌ [Bookmark Action] 토글 실패:', error.message);
    return { success: false, bookmarked: false, error: error.message };
  }
}

// ─────────────────────────────────────────────
// 북마크 상태 여부 조회 서버 액션
// ─────────────────────────────────────────────
export async function checkBookmarked(materialId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseServer();
    const userId = await getUserId(supabase);

    const { data, error } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('material_id', materialId)
      .maybeSingle();

    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}
