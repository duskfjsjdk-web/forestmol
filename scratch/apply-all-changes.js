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

let content = step888Code;

function applyReplace(content, callArgs, stepIndex) {
  if (!callArgs) return content;
  
  // replace_file_content has TargetContent and ReplacementContent directly
  if (callArgs.TargetContent && callArgs.ReplacementContent) {
    const target = callArgs.TargetContent;
    const replacement = callArgs.ReplacementContent;
    if (!content.includes(target)) {
      console.warn(`[Step ${stepIndex}] Warning: TargetContent not found in content!`);
      // Let's do a fuzzy whitespace check if exact match fails
      return content;
    }
    content = content.replace(target, replacement);
    console.log(`[Step ${stepIndex}] Applied single replace_file_content`);
  }
  
  // multi_replace_file_content has ReplacementChunks
  if (callArgs.ReplacementChunks) {
    const chunks = typeof callArgs.ReplacementChunks === 'string' ? JSON.parse(callArgs.ReplacementChunks) : callArgs.ReplacementChunks;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const target = chunk.TargetContent;
      const replacement = chunk.ReplacementContent;
      if (!content.includes(target)) {
        console.warn(`[Step ${stepIndex}] Warning: Chunk ${i} TargetContent not found!`);
        continue;
      }
      content = content.replace(target, replacement);
      console.log(`[Step ${stepIndex}] Applied chunk ${i}`);
    }
  }
  
  return content;
}

console.log('Original content length:', content.length);
content = applyReplace(content, step1030Call, 1030);
content = applyReplace(content, step1054Call, 1054);
content = applyReplace(content, step1068Call, 1068);

console.log('Final content length:', content.length);
fs.writeFileSync('C:/Users/1wasp/forestmol/src/app/page.tsx', content, 'utf-8');
console.log('Wrote final content to page.tsx');
