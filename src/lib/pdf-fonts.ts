import { Font } from '@react-pdf/renderer';
import path from 'path';

// ────────────────────────────────────────────────────────
// 가상 인쇄소(@react-pdf/renderer)를 위한 한글 폰트 등록 헬퍼
// ────────────────────────────────────────────────────────

// 서버 환경(API route)과 브라우저 환경(Client)에 따라 파일 경로를 다르게 지정합니다.
// - 서버: 로컬 하드디스크의 절대 경로 (process.cwd() + public/fonts/...)
// - 브라우저: 웹서버 상대 경로 (/fonts/...)
const getFontSource = () => {
  if (typeof window === 'undefined') {
    return path.resolve(process.cwd(), 'public/fonts/NotoSansKR-Regular.ttf');
  }
  return '/fonts/NotoSansKR-Regular.ttf';
};

// 폰트 등록하기
Font.register({
  family: 'NotoSansKR',
  src: getFontSource(),
});

export { Font };
