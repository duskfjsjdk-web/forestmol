import { loadEnvConfig } from '@next/env';
import { exec } from 'child_process';
import { promisify } from 'util';

// 환경 변수 설정 불러오기
loadEnvConfig(process.cwd());

const execAsync = promisify(exec);

const DATA_GO_KR_API_KEY = process.env.DATA_GO_KR_API_KEY;
const API_URL = 'https://apis.data.go.kr/1400119/forstPlantInfo/getForstPlantInfo';

// API 인증키가 동기화되었는지 확인하는 함수
async function checkSyncStatus(): Promise<boolean> {
  if (!DATA_GO_KR_API_KEY || DATA_GO_KR_API_KEY === 'YOUR_DATA_GO_KR_API_KEY_HERE') {
    return false;
  }
  const url = `${API_URL}?serviceKey=${encodeURIComponent(DATA_GO_KR_API_KEY)}&pageNo=1&numOfRows=1`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    // 오류가 발견되면 아직 미완료로 판정
    if (text.includes('Unexpected errors') || text.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR')) {
      return false;
    }
    // 정상적인 XML 응답 구조가 발견되면 동기화 완료로 판정
    return text.includes('<response>');
  } catch (e) {
    return false;
  }
}

async function startPoller() {
  console.log('⏰ [ForestMol] 공공데이터 API 키 동기화 자동 감지기를 시작합니다. (5분마다 자동 검사)');
  
  let attempts = 1;
  const intervalMs = 5 * 60 * 1000; // 5분 간격

  while (true) {
    const currentTime = new Date().toLocaleTimeString();
    console.log(`\n[${currentTime}] 동기화 여부 검사 중... (시도 횟수: ${attempts})`);
    
    const isSynced = await checkSyncStatus();

    if (isSynced) {
      console.log('🎉 [감지 완료] API 키 동기화가 성공적으로 확인되었습니다!');
      console.log('🚀 약용식물 데이터 수집 스크립트(ingest-herbs.ts)를 실행합니다...');
      
      try {
        const { stdout, stderr } = await execAsync('npx tsx scripts/ingest-herbs.ts');
        console.log('\n========= 수집 스크립트 실행 로그 =========');
        console.log(stdout);
        if (stderr) {
          console.error('⚠️ 표준 에러 출력:', stderr);
        }
        console.log('==========================================');
      } catch (err) {
        console.error('❌ 수집 스크립트 실행 중 에러 발생:', err);
      }
      
      console.log('📢 작업을 완료하여 감지기를 종료합니다.');
      break;
    } else {
      console.log('😴 아직 정부 관공서 서버에 인증키가 동기화되지 않았습니다.');
      console.log(`💤 5분 후(${new Date(Date.now() + intervalMs).toLocaleTimeString()})에 다시 검사합니다.`);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      attempts++;
    }
  }
}

startPoller();
