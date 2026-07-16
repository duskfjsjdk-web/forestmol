import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 연구원 연구실 출입을 통제하는 경비실(미들웨어)입니다.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 우회 통행증(?bypass=true)이 들어왔는지 확인합니다.
  const bypass = request.nextUrl.searchParams.get('bypass') === 'true';
  
  // 쿠키 저장소에서 'forestmol-token' 통행증이 있는지 꺼내봅니다.
  const token = request.cookies.get('forestmol-token')?.value;

  // 1. 연구소 핵심 구역(/app/*)에 가려는데 통행증이 없는 경우
  if (pathname.startsWith('/app')) {
    if (!token && !bypass) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. 이미 로그인한 상태(통행증 소지)인데 대문(/login)이나 첫 페이지(/)에 접근하는 경우
  // -> 단, 우회 파라미터(?bypass=true)가 켜져 있으면 리다이렉트를 건너뛰고 해당 페이지를 그대로 렌더링합니다.
  if (pathname === '/login') {
    if (token && !bypass) {
      const searchUrl = new URL('/app/search', request.url);
      return NextResponse.redirect(searchUrl);
    }
  }

  return NextResponse.next();
}

// 경비원(미들웨어)이 감시하고 통제할 구역들의 패턴을 적어둡니다.
export const config = {
  matcher: [
    /*
     * 아래 경로들을 제외한 모든 요청 경로에 미들웨어를 적용합니다:
     * - api (API 내부 통신용 라우트)
     * - _next/static (프론트엔드 정적 로딩 파일)
     * - _next/image (이미지 리소스 최적화 파일)
     * - favicon.ico, data, 각종 이미지 확장자들
     */
    '/((?!api|_next/static|_next/image|favicon.ico|data|.*\\.png|.*\\.jpg|.*\\.svg).*)',
  ],
};
