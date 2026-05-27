const fs = require('fs');
const path = require('path');
const https = require('https');

const dir = path.join(__dirname, '../public/fonts');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const destPath = path.join(dir, 'NotoSansKR-Regular.ttf');

const urls = [
  // 1. 구글 폰트 공식 깃허브 (대체 브랜치/가변 폰트)
  'https://raw.githubusercontent.com/google/fonts/main/ofl/notosanskr/NotoSansKR%5Bwght%5D.ttf',
  'https://github.com/google/fonts/raw/main/ofl/notosanskr/static/NotoSansKR-Regular.ttf',
  // 2. 한글 폰트 대표 저장소
  'https://raw.githubusercontent.com/hangeul-fonts/NotoSansKR/master/NotoSansKR-Regular.ttf',
  'https://raw.githubusercontent.com/hangeul-fonts/NotoSansKR/main/NotoSansKR-Regular.ttf',
  'https://raw.githubusercontent.com/hangeul-fonts/noto-sans-kr/master/NotoSansKR-Regular.ttf',
  // 3. 대체 한글 폰트 (Pretendard는 Noto Sans KR의 훌륭한 대안입니다)
  'https://raw.githubusercontent.com/orioncactus/pretendard/main/packages/pretendard/dist/web/static/Pretendard-Regular.ttf'
];

function download(index) {
  if (index >= urls.length) {
    console.error('❌ 모든 URL에서 폰트를 다운로드하지 못했습니다.');
    process.exit(1);
  }

  const url = urls[index];
  console.log(`\n[${index + 1}/${urls.length}] 다운로드 시도 중: ${url}`);

  https.get(url, (response) => {
    // 리다이렉트 처리 (301, 302)
    if (response.statusCode === 301 || response.statusCode === 302) {
      const redirectUrl = response.headers.location;
      console.log(`➡️ 리다이렉트 이동: ${redirectUrl}`);
      // 리다이렉트 경로로 재요청
      https.get(redirectUrl, (redirectRes) => {
        handleResponse(redirectRes, index);
      }).on('error', (err) => {
        console.warn(`⚠️ 리다이렉션 실패: ${err.message}`);
        download(index + 1);
      });
      return;
    }

    handleResponse(response, index);
  }).on('error', (err) => {
    console.warn(`⚠️ 연결 실패: ${err.message}`);
    download(index + 1);
  });
}

function handleResponse(response, index) {
  if (response.statusCode !== 200) {
    console.warn(`⚠️ 다운로드 실패 (상태 코드: ${response.statusCode})`);
    download(index + 1);
    return;
  }

  const file = fs.createWriteStream(destPath);
  response.pipe(file);

  file.on('finish', () => {
    file.close();
    
    // 다운로드 성공 후 검증
    if (fs.existsSync(destPath)) {
      const stats = fs.statSync(destPath);
      if (stats.size < 100000) {
        console.warn(`⚠️ 파일 크기가 너무 작습니다 (${stats.size} bytes). 비정상 파일로 판단하여 다음 후보를 시도합니다.`);
        fs.unlinkSync(destPath);
        download(index + 1);
      } else {
        console.log(`✅ 다운로드 성공! 파일 크기: ${stats.size} bytes`);
        console.log(`📍 저장 경로: ${destPath}`);
        process.exit(0);
      }
    } else {
      console.warn(`⚠️ 파일이 로컬에 저장되지 않았습니다.`);
      download(index + 1);
    }
  });

  file.on('error', (err) => {
    file.close();
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }
    console.warn(`⚠️ 파일 쓰기 실패: ${err.message}`);
    download(index + 1);
  });
}

// 시작
download(0);
