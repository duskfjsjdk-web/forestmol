import { loadEnvConfig } from '@next/env';
import { GoogleGenerativeAI } from '@google/generative-ai';

loadEnvConfig(process.cwd());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function testEmbedding() {
  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY가 없습니다.');
    return;
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  // 다국어 성능이 좋은 gemini-embedding-001 모델 사용
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

  try {
    console.log('🔄 text-embedding-004 호출 중...');
    const response = await model.embedContent('소재 탐색 임베딩 테스트 텍스트입니다.');
    
    const embedding = response.embedding.values;
    console.log('✅ 성공!');
    console.log('임베딩 차원 수:', embedding.length);
    console.log('임베딩 앞 5개 값:', embedding.slice(0, 5));
  } catch (error) {
    console.error('❌ 에러 발생:', error);
  }
}

testEmbedding();
