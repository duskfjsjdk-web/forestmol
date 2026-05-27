import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const DATA_GO_KR_API_KEY = process.env.DATA_GO_KR_API_KEY;
const API_URL = 'http://api.forest.go.kr/openapi/service/mclltInfoService/getMclltSearch';

async function test() {
  if (!DATA_GO_KR_API_KEY) {
    console.error('⚠️ .env.local 파일에 DATA_GO_KR_API_KEY를 설정해 주세요.');
    return;
  }

  // 1. 브라우저인 것처럼 위장할 헤더 조립
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/xml,text/xml,*/*',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
  };

  // 2. 인코딩 버전과 비인코딩 버전 주소 조립
  const urlWithEncoding = `${API_URL}?serviceKey=${encodeURIComponent(DATA_GO_KR_API_KEY)}&pageNo=1&numOfRows=1`;
  const urlWithoutEncoding = `${API_URL}?serviceKey=${DATA_GO_KR_API_KEY}&pageNo=1&numOfRows=1`;

  const testCases = [
    { url: urlWithEncoding, name: '인코딩 적용 + 브라우저 위장 헤더' },
    { url: urlWithoutEncoding, name: '인코딩 미적용 + 브라우저 위장 헤더' }
  ];

  for (const testCase of testCases) {
    console.log(`\n👉 시도 [${testCase.name}]`);
    console.log(`URL: ${testCase.url.substring(0, 110)}...`);

    try {
      const res = await fetch(testCase.url, {
        headers,
        signal: AbortSignal.timeout(5000)
      });
      const text = await res.text();
      console.log(`   [응답 코드]: ${res.status}`);
      console.log(`   [응답 내용(앞 300자)]: ${text.substring(0, 300).replace(/\s+/g, ' ')}`);

      if (text.includes('<item>') || text.includes('<response>')) {
        console.log(`   ✨ [성공] 브라우저 위장으로 정상 XML 응답 획득에 성공했습니다!`);
      }
    } catch (err: any) {
      console.log(`   ❌ 실패: ${err.message || err}`);
    }
  }
}

test();
