'use server';

import { getSupabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
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
// 1. 프로젝트 목록 조회 (담긴 소재 개수 포함)
// ─────────────────────────────────────────────
export async function getProjects() {
  try {
    const supabase = getSupabaseServer();
    const userId = await getUserId(supabase);

    // 본인 프로젝트 목록을 가져옵니다.
    // project_materials(count) 조인을 통해 자식 로우 개수를 간편히 셉니다.
    const { data, error } = await supabase
      .from('projects')
      .select('*, project_materials(count)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      clientName: p.client_name,
      description: p.description,
      status: p.status,
      createdAt: p.created_at,
      materialCount: p.project_materials?.[0]?.count ?? 0,
    }));

  } catch (error: any) {
    console.error('❌ [Project Action] 목록 조회 실패:', error.message);
    return [];
  }
}

// ─────────────────────────────────────────────
// 2. 새 프로젝트 생성
// ─────────────────────────────────────────────
export async function createProject(name: string, clientName: string, description: string = '') {
  try {
    const supabase = getSupabaseServer();
    const userId = await getUserId(supabase);

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name,
        client_name: clientName,
        description,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/app/projects');
    return { success: true, project: data };

  } catch (error: any) {
    console.error('❌ [Project Action] 생성 실패:', error.message);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────
// 3. 프로젝트에 소재 담기
// ─────────────────────────────────────────────
export async function addMaterialToProject(projectId: string, materialId: string, materialName: string) {
  try {
    const supabase = getSupabaseServer();
    
    // 이미 해당 프로젝트에 동일한 소재가 담겨 있는지 확인하여 중복 적재를 막습니다.
    const { data: existing, error: selectError } = await supabase
      .from('project_materials')
      .select('id')
      .eq('project_id', projectId)
      .eq('material_id', materialId)
      .maybeSingle();

    if (selectError) throw selectError;

    if (existing) {
      return { success: true, message: '이미 해당 프로젝트에 등록된 소재입니다.' };
    }

    const { error: insertError } = await supabase
      .from('project_materials')
      .insert({
        project_id: projectId,
        material_id: materialId,
        material_name: materialName,
      });

    if (insertError) throw insertError;

    revalidatePath(`/app/projects/${projectId}`);
    return { success: true, message: '프로젝트에 소재를 성공적으로 추가했습니다.' };

  } catch (error: any) {
    console.error('❌ [Project Action] 소재 추가 실패:', error.message);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────
// 4. 프로젝트 상세 및 담긴 소재 조회
// ─────────────────────────────────────────────
export async function getProjectDetail(projectId: string) {
  try {
    const supabase = getSupabaseServer();

    // 프로젝트 메타 획득
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) throw projectError;

    // 담긴 소재 목록 획득 (소재 테이블 정보와 매핑하여 효능/출처 등도 서브 조인 획득 가능)
    const { data: materials, error: materialsError } = await supabase
      .from('project_materials')
      .select('*, materials(*)')
      .eq('project_id', projectId)
      .order('added_at', { ascending: true });

    if (materialsError) throw materialsError;

    return {
      project: {
        id: project.id,
        name: project.name,
        clientName: project.client_name,
        description: project.description,
        status: project.status,
        createdAt: project.created_at,
      },
      materials: (materials || []).map((m: any) => ({
        id: m.id,
        projectId: m.project_id,
        materialId: m.material_id,
        materialName: m.material_name,
        includeInReport: m.include_in_report,
        addedAt: m.added_at,
        // materials 테이블 원본 데이터 연동
        sourceOrg: m.materials?.source_org,
        dataSource: m.materials?.data_source,
        displaySpecies: m.materials?.species || m.materials?.scientific_name || '정보 없음',
      })),
    };

  } catch (error: any) {
    console.error('❌ [Project Action] 상세 조회 실패:', error.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// 5. 프로젝트 소재 리포트 포함 여부 토글
// ─────────────────────────────────────────────
export async function toggleMaterialReportStatus(projectMaterialId: string, include: boolean) {
  try {
    const supabase = getSupabaseServer();

    const { error } = await supabase
      .from('project_materials')
      .update({ include_in_report: include })
      .eq('id', projectMaterialId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('❌ [Project Action] 리포트 포함 여부 갱신 실패:', error.message);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────
// 6. 프로젝트 정보 수정 (이름, 고객사명, 설명, 진행상태)
// ─────────────────────────────────────────────
export async function updateProject(
  id: string,
  name: string,
  clientName: string,
  description: string = '',
  status: string = 'active'
) {
  try {
    const supabase = getSupabaseServer();
    await getUserId(supabase); // 로그인 인증 세션 체크

    const { data, error } = await supabase
      .from('projects')
      .update({
        name,
        client_name: clientName,
        description,
        status,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/app/projects');
    revalidatePath(`/app/projects/${id}`);
    return { success: true, project: data };

  } catch (error: any) {
    console.error('❌ [Project Action] 수정 실패:', error.message);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────
// 7. 프로젝트 삭제 (물리적 영구 삭제)
// ─────────────────────────────────────────────
export async function deleteProject(id: string) {
  try {
    const supabase = getSupabaseServer();
    await getUserId(supabase); // 로그인 인증 세션 체크

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/app/projects');
    return { success: true };

  } catch (error: any) {
    console.error('❌ [Project Action] 삭제 실패:', error.message);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────
// 8. 프로젝트 내 소재 삭제 (제거)
// ─────────────────────────────────────────────
export async function removeMaterialFromProject(projectMaterialId: string) {
  try {
    const supabase = getSupabaseServer();
    await getUserId(supabase); // 로그인 인증 세션 체크

    const { error } = await supabase
      .from('project_materials')
      .delete()
      .eq('id', projectMaterialId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('❌ [Project Action] 소재 제거 실패:', error.message);
    return { success: false, error: error.message };
  }
}


