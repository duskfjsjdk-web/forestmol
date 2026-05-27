const fs = require('fs');

const logFilePath = 'C:/Users/1wasp/.gemini/antigravity-ide/brain/b63c1637-866a-4e43-a1c6-e1f472d55e7a/.system_generated/logs/transcript.jsonl';
const lines = fs.readFileSync(logFilePath, 'utf-8').split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.step_index === 888 && obj.tool_calls) {
      console.log('Step 888 Tool Calls:', JSON.stringify(obj.tool_calls, null, 2));
    }
    if (obj.step_index === 649 && obj.tool_calls) {
      console.log('Step 649 Tool Calls:', JSON.stringify(obj.tool_calls, null, 2));
    }
  } catch (e) {}
}
