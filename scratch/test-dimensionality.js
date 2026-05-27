const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent({
      content: {
        parts: [{ text: '소재 탐색 임베딩 테스트 텍스트입니다.' }]
      },
      outputDimensionality: 768
    });
    console.log(`✅ Success! Dimension: ${result.embedding.values.length}`);
  } catch (err) {
    console.log(`❌ Failed: ${err.message}`);
  }
}

test();
