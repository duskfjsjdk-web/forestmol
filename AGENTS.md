# ForestMol — AGENTS.md

## 서비스 한 줄 정의
화장품 ODM·바이오 소재 연구팀이 산림 공공데이터 7종 기반 AI로
소재 후보를 탐색하고 특허 안전성까지 검증한 제안서를
당일 완성할 수 있게 하는 유일한 플랫폼.

## 핵심 사용자
- Primary: 중견 ODM 소재 연구원 (코스메카코리아, 씨앤씨인터내셔널 등)
- Secondary: K-뷰티 인디 브랜드 창업자

## 현재 상태
- 랜딩 페이지 완성 (파일럿 신청 폼 + Supabase 저장)
- 다음 작업: 공공데이터 파이프라인 → 로그인 → 소재 탐색

## 기술 스택
- Frontend: Next.js 14, Tailwind CSS, shadcn/ui
- DB: Supabase PostgreSQL + pgvector
- 임베딩: OpenAI text-embedding-3-small
- AI: Anthropic Claude Sonnet 4
- 특허: KIPRIS Open API
- 공공데이터: data.go.kr (산림 7종)
- 배포: Vercel

## 핵심 규칙 (반드시 지킬 것)
- Claude는 소재 데이터를 절대 생성하지 않음
- 모든 소재는 materials 테이블 실제 데이터만 사용
- 환경변수는 반드시 .env.local에만 저장
- 한국어 주석 사용

## 폴더 구조
src/app/
  page.tsx                  ← 랜딩 (완성)
  (auth)/login/page.tsx     ← 로그인
  app/
    layout.tsx              ← 사이드바 레이아웃
    search/page.tsx         ← 소재 탐색 (핵심)
    projects/page.tsx
    reports/page.tsx
scripts/
  ingest-data.ts            ← 공공데이터 수집

## 디자인 원칙
- Primary Color: #2D5016 (Forest Green)
- Background: #FAF7F0
- Font: Noto Sans KR + DM Mono
- B2B 신뢰감, 깔끔함. 화려한 애니메이션 없음.

## 다음 작업 순서
1. scripts/ingest-data.ts (공공데이터 7종 수집 + pgvector 저장)
2. /login 페이지 + 앱 사이드바 레이아웃
3. /app/search RAG 소재 탐색
4. KIPRIS 특허 배지
5. 소재 상세 슬라이드오버
6. PDF 리포트 생성
