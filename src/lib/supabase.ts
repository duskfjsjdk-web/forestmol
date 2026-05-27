import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isValidConfig = supabaseUrl && supabaseKey;

if (!isValidConfig) {
  console.warn(
    "⚠️ [ForestMol] Supabase 환경 변수가 설정되지 않았습니다!\n" +
    "로컬 개발 시 .env.local 파일에 NEXT_PUBLIC_SUPABASE_URL 및 NEXT_PUBLIC_SUPABASE_ANON_KEY를 추가해 주세요."
  );
}

// 환경 변수가 없을 때 createClient가 에러를 발생시키는 것을 방지하기 위해 더미 값을 사용합니다.
export const supabase = isValidConfig
  ? createClient(supabaseUrl, supabaseKey)
  : createClient('https://placeholder-url.supabase.co', 'placeholder-anon-key');



