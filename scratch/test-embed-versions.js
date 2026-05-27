const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('No GEMINI_API_KEY found');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function test(modelName, version) {
  try {
    console.log(`Testing ${modelName} on ${version || 'default'}...`);
    const model = genAI.getGenerativeModel({ model: modelName }, version ? { apiVersion: version } : undefined);
    const result = await model.embedContent('Hello world');
    console.log(`✅ Success! Dimension: ${result.embedding.values.length}`);
  } catch (err) {
    console.log(`❌ Failed: ${err.message}`);
  }
}

async function run() {
  await test('text-embedding-004', 'v1');
  await test('text-embedding-004', 'v1beta');
  await test('text-embedding-004', undefined);
  await test('gemini-embedding-001', 'v1');
  await test('gemini-embedding-001', 'v1beta');
  await test('gemini-embedding-001', undefined);
}

run();
