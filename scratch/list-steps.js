const fs = require('fs');

const logFilePath = 'C:/Users/1wasp/.gemini/antigravity-ide/brain/b63c1637-866a-4e43-a1c6-e1f472d55e7a/.system_generated/logs/transcript.jsonl';

const lines = fs.readFileSync(logFilePath, 'utf-8').split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    const text = JSON.stringify(obj);
    if (text.includes('src/app/page.tsx')) {
      console.log(`Step: ${obj.step_index}, Source: ${obj.source}, Type: ${obj.type}, Length: ${text.length}`);
    }
  } catch (e) {}
}
