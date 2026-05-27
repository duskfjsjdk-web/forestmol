import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function testInsert() {
  console.log('🧪 파일럿 신청 폼 유효성 검사 및 DB 인서트 통합 테스트를 수행합니다.');
  
  // 환경변수 로드 후 동적 임포트하여 Supabase 클라이언트가 올바른 환경변수를 바라보게 만듭니다.
  const { submitPilot } = await import('../src/app/actions/submitPilot');

  const testData = {
    name: "테스트",
    company: "테스트",
    email: "duskfjsjdk@gmail.com",
    categories: "anti-aging" as any
  };

  console.log('입력 데이터:', testData);

  // 이메일 중복 시 UNIQUE 제약조건으로 에러가 날 수 있으므로 임의의 무작위 요소를 추가합니다.
  const randomSuffix = Math.floor(Math.random() * 10000);
  testData.email = `duskfjsjdk_${randomSuffix}@gmail.com`;
  console.log('중복 방지를 위한 변형된 테스트 이메일:', testData.email);

  const result = await submitPilot(testData);

  if (!result.success) {
    console.error('❌ 유효성 검사 혹은 인서트 실패!');
    console.error('반환 메시지:', result.message);
  } else {
    console.log('✅ 파일럿 신청 처리 성공!');
    console.log('반환 메시지:', result.message);
  }
}

testInsert();
