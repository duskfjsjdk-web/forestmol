import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// ─────────────────────────────────────────────
// 서버 환경 전용 Supabase 인증 클라이언트 팩토리
// ─────────────────────────────────────────────
export function getSupabaseServer() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // 로그인 폼에서 수동으로 구워둔 'forestmol-token' 쿠키를 가져옵니다.
  const token = cookies().get('forestmol-token')?.value;

  const headers: Record<string, string> = {};
  if (token) {
    // PostgREST 데이터베이스 쿼리 시 RLS 통과를 위해 Authorization 헤더에 주입합니다.
    headers['Authorization'] = `Bearer ${token}`;
  }

  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers,
    },
    auth: {
      persistSession: false,
    },
  });
}

// RLS를 우회하여 백엔드 내부적인 스토리지 저장 및 데이터 변경을 수행할 수 있는 어드민 클라이언트
export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!serviceKey) {
    console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다. RLS가 작동하는 일반 서버 클라이언트로 대체합니다.");
    return getSupabaseServer();
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
    },
  });
}

