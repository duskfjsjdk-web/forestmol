const fs = require('fs');

const logFilePath = 'C:/Users/1wasp/.gemini/antigravity-ide/brain/b63c1637-866a-4e43-a1c6-e1f472d55e7a/.system_generated/logs/transcript.jsonl';
const lines = fs.readFileSync(logFilePath, 'utf-8').split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.step_index === 888 && obj.tool_calls) {
      const call = obj.tool_calls[0];
      const args = typeof call.args === 'string' ? JSON.parse(call.args) : call.args;
      fs.writeFileSync('C:/Users/1wasp/forestmol/scratch/page_base_full.tsx', args.CodeContent, 'utf-8');
      console.log('Successfully wrote page_base_full.tsx');
      break;
    }
  } catch (e) {}
}
