const React = require('react');
const { pdf } = require('@react-pdf/renderer');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. 환경변수 로드 (.env.local)
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error("❌ 환경 변수(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)가 로드되지 않았습니다.");
  process.exit(1);
}

// ts-node 레지스터로 TypeScript/JSX 파일 직접 로드 가능하게 처리 (JSX 트랜스파일 활성화)
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es2020',
    esModuleInterop: true,
    jsx: 'react' // ts-node가 JSX 문법(<Document> 등)을 해석할 수 있도록 설정합니다.
  }
});

// NotoSansKR 폰트 경로 등록
const { Font } = require('@react-pdf/renderer');
Font.register({
  family: 'NotoSansKR',
  src: path.resolve(__dirname, '../public/fonts/NotoSansKR-Regular.ttf'),
});

// ReportDocument 로드
const { ReportDocument } = require('../src/components/reports/ReportDocument');

async function run() {
  console.log(`\n======================================================`);
  console.log(`[TEST] Supabase 로그인 및 JWT 획득 시작`);
  console.log(`======================================================`);

  // 초기 비로그인 클라이언트 생성
  const tempSupabase = createClient(supabaseUrl, anonKey);

  // 테스트 유저 정보로 실 로그인 시도
  const { data: authData, error: authErr } = await tempSupabase.auth.signInWithPassword({
    email: 'test@forestmol.com',
    password: 'forestmol2025!'
  });

  if (authErr || !authData.session) {
    console.error('❌ Supabase 로그인 실패:', authErr?.message || '세션이 없습니다.');
    process.exit(1);
  }

  const token = authData.session.access_token;
  const user = authData.user;
  console.log(`✅ 로그인 성공! 유저 이메일: ${user.email}`);

  // 획득한 JWT 토큰을 Authorization 헤더에 탑재한 실제 유저 전용 클라이언트 생성
  const supabase = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  const projectId = '976dd673-1d79-4f39-9865-5c76f5dd4a9f';
  console.log(`\n[TEST] 프로젝트 ID: ${projectId} 리포트 테스트 시작`);

  // 2. 프로젝트 상세 데이터 조회 (RLS 적용)
  const { data: project, error: pErr } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();
  if (pErr) throw pErr;

  console.log(`✅ [1/5] 프로젝트 조회 완료: "${project.name}" (고객사: ${project.client_name || '미지정'})`);

  // 3. 프로젝트의 소재 목록 조회
  const { data: pmList, error: pmErr } = await supabase
    .from('project_materials')
    .select('*, materials(*)')
    .eq('project_id', projectId)
    .eq('include_in_report', true);
  if (pmErr) throw pmErr;

  console.log(`✅ [2/5] 리포트 포함 소재 목록 조회 완료 (${pmList.length}개)`);
  pmList.forEach((pm, i) => {
    console.log(`   - 소재 [${i + 1}]: ${pm.material_name} (${pm.materials?.species || '학명 없음'})`);
  });

  const materials = pmList.map(pm => ({
    id: pm.material_id,
    name_ko: pm.material_name || pm.materials?.name_ko || '이름 없음',
    species: pm.materials?.species || '',
    data_source: pm.materials?.data_source || '',
    source_org: pm.materials?.source_org || '',
    bioactivity: pm.materials?.bioactivity || [],
    compounds: pm.materials?.compounds || [],
    patent_count: pm.materials?.patent_count || 0,
    patents: pm.materials?.patents || [],
    kegg_pathways: pm.materials?.kegg_pathways || [],
    kegg_enzymes: pm.materials?.kegg_enzymes || []
  }));

  // 4. PDF 문서 렌더링
  console.log(`[TEST] 📄 @react-pdf/renderer를 이용한 PDF 생성 렌더링 중...`);
  const reportElement = React.createElement(ReportDocument, {
    project: {
      name: project.name,
      clientName: project.client_name || '미지정',
      description: project.description || ''
    },
    materials,
    template: 'client',
    options: {
      includePatents: true,
      includeCompounds: true,
      includeSources: true,
      includeBioactivity: true
    },
    creatorEmail: user.email
  });

  const { renderToStream } = require('@react-pdf/renderer');
  const stream = await renderToStream(reportElement);
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  const pdfBuffer = Buffer.concat(chunks);
  console.log(`✅ [3/5] PDF 렌더링 완성! 버퍼 크기: ${pdfBuffer.length} bytes`);


  // 로컬에 임시 저장 (개발자 육안 확인용)
  const localPath = path.resolve(__dirname, '../public/test_report.pdf');
  fs.writeFileSync(localPath, pdfBuffer);
  console.log(`📍 [LOCAL] 테스트 PDF 로컬 생성 성공: ${localPath}`);

  // 5. Supabase Storage 'reports' 버킷 업로드 (유저 권한 RLS)
  const uniqueName = `test_${Date.now()}.pdf`;
  const filePath = `projects/${projectId}/${uniqueName}`;
  console.log(`[TEST] ☁️ Supabase Storage 업로드 중: ${filePath}`);

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from('reports')
    .upload(filePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true
    });

  if (uploadErr) throw uploadErr;
  console.log(`✅ [4/5] Storage 업로드 대성공!`);

  const { data: { publicUrl } } = supabase.storage.from('reports').getPublicUrl(filePath);
  console.log(`🔗 Storage Public URL: ${publicUrl}`);

  // 6. DB reports 테이블 인서트 (유저 권한 RLS)
  const shareToken = `test-token-${Date.now()}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30일 뒤 만료

  const { error: insErr } = await supabase
    .from('reports')
    .insert({
      project_id: projectId,
      user_id: user.id,
      title: `[TEST] ${project.name} 제안 리포트`,
      pdf_url: publicUrl,
      share_token: shareToken,
      expires_at: expiresAt.toISOString()
    });

  if (insErr) throw insErr;
  console.log(`✅ [5/5] DB reports 테이블 내역 등록 성공!`);
  console.log(`\n🎉 모든 리포트 생성 파이프라인 검증 완료!`);
  console.log(`👉 외부 공유 페이지 주소: http://localhost:3000/share/${shareToken}`);
  console.log(`======================================================\n`);
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌ [TEST ERROR]', err);
  process.exit(1);
});
