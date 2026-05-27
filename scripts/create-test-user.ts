// 테스트 계정 생성 스크립트
// Supabase Admin API (service_role key)를 사용하여 테스트 유저를 생성합니다.

const SUPABASE_URL = 'https://kvsytrnlgzyemmxieoxr.supabase.co';

// service_role key가 필요합니다 - 환경변수에서 읽거나 직접 입력
// Supabase Dashboard > Project Settings > API > service_role key
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function createTestUser() {
  if (!SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.');
    console.log('📌 .env.local 에 SUPABASE_SERVICE_ROLE_KEY=... 를 추가해주세요.');
    console.log('   Supabase Dashboard > Project Settings > API > service_role (secret)');
    process.exit(1);
  }

  const testEmail = 'test@forestmol.com';
  const testPassword = 'forestmol2025!';

  console.log(`\n🌿 ForestMol 테스트 계정 생성 중...`);
  console.log(`   이메일: ${testEmail}`);
  console.log(`   비밀번호: ${testPassword}\n`);

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // 이메일 인증 없이 바로 로그인 가능하게 설정
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    // 이미 존재하는 경우
    if (data.message?.includes('already been registered') || data.code === 'email_exists') {
      console.log('ℹ️  해당 이메일은 이미 등록되어 있습니다.');
      console.log('✅ 기존 계정으로 로그인하세요:');
    } else {
      console.error('❌ 계정 생성 실패:', JSON.stringify(data, null, 2));
      process.exit(1);
    }
  } else {
    console.log('✅ 테스트 계정 생성 완료!');
    console.log(`   User ID: ${data.id}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 로그인 정보');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   URL:      http://localhost:3000/login`);
  console.log(`   이메일:   ${testEmail}`);
  console.log(`   비밀번호: ${testPassword}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

createTestUser();
