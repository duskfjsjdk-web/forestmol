const fs = require('fs');

const logFilePath = 'C:/Users/1wasp/.gemini/antigravity-ide/brain/b63c1637-866a-4e43-a1c6-e1f472d55e7a/.system_generated/logs/transcript.jsonl';
const lines = fs.readFileSync(logFilePath, 'utf-8').split('\n');

let step888Code = null;
let step1030Call = null;
let step1054Call = null;
let step1068Call = null;

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.step_index === 888 && obj.tool_calls) {
      const call = obj.tool_calls[0];
      const args = typeof call.args === 'string' ? JSON.parse(call.args) : call.args;
      step888Code = args.CodeContent;
    }
    if (obj.step_index === 1030 && obj.tool_calls) {
      const call = obj.tool_calls[0];
      step1030Call = typeof call.args === 'string' ? JSON.parse(call.args) : call.args;
    }
    if (obj.step_index === 1054 && obj.tool_calls) {
      const call = obj.tool_calls[0];
      step1054Call = typeof call.args === 'string' ? JSON.parse(call.args) : call.args;
    }
    if (obj.step_index === 1068 && obj.tool_calls) {
      const call = obj.tool_calls[0];
      step1068Call = typeof call.args === 'string' ? JSON.parse(call.args) : call.args;
    }
  } catch (e) {}
}

console.log('Step 888 Code loaded:', !!step888Code);
console.log('Step 1030 Call loaded:', !!step1030Call);
console.log('Step 1054 Call loaded:', !!step1054Call);
console.log('Step 1068 Call loaded:', !!step1068Call);

if (step888Code) {
  // Let's write the base 888 code first
  fs.writeFileSync('C:/Users/1wasp/forestmol/scratch/page_base.tsx', step888Code, 'utf-8');
  console.log('Wrote page_base.tsx');
}
