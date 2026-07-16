import { loadEnvConfig } from '@next/env';
import { GoogleGenerativeAI } from '@google/generative-ai';

loadEnvConfig(process.cwd());
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function test() {
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
  const response = await model.embedContent({ content: { role: 'user', parts: [{ text: '편백' }] }, outputDimensionality: 768 } as any);
  console.log(`[TEST] queryText: "편백", Embedding length: ${response.embedding.values.length}, first val: ${response.embedding.values[0]}`);
}
test();
