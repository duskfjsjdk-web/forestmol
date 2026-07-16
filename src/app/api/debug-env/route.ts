// Vercel 런타임 환경변수 실시간 진단용 API
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    process_supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || '없음',
    process_supabase_anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(0, 15) + '...') : '없음',
    process_gemini_key: process.env.GEMINI_API_KEY ? (process.env.GEMINI_API_KEY.slice(0, 5) + '...') : '없음',
  });
}
