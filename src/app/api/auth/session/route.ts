import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// 로그인 성공 시 통행증(쿠키)을 발급해 주는 서비스 상자입니다.
export async function POST(request: Request) {
  try {
    const { accessToken, refreshToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json({ error: '인증 토큰(Access Token)이 누락되었습니다.' }, { status: 400 });
    }

    const cookieStore = cookies();
    
    // 1. 액세스 토큰 쿠키 설정 (안전을 위해 자바스크립트가 직접 읽을 수 없도록 httpOnly로 설정)
    cookieStore.set('forestmol-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 1일 동안 유효
    });

    // 2. 리프레시 토큰이 있을 경우 함께 쿠키에 보관
    if (refreshToken) {
      cookieStore.set('forestmol-refresh-token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7일 동안 유효
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '세션 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 로그아웃 시 통행증(쿠키)을 회수(삭제)하는 서비스 상자입니다.
export async function DELETE() {
  const cookieStore = cookies();
  cookieStore.delete('forestmol-token');
  cookieStore.delete('forestmol-refresh-token');
  return NextResponse.json({ success: true });
}
