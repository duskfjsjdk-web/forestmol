const fs = require('fs');

const logFilePath = 'C:/Users/1wasp/.gemini/antigravity-ide/brain/b63c1637-866a-4e43-a1c6-e1f472d55e7a/.system_generated/logs/transcript.jsonl';
const lines = fs.readFileSync(logFilePath, 'utf-8').split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.content && obj.content.includes('File Path: `file:///c:/Users/1wasp/forestmol/src/app/page.tsx`')) {
      console.log(`Step ${obj.step_index}: VIEW_FILE content length is ${obj.content.length}`);
    }
    // Also look at tool calls for replace_file_content or write_to_file targetting page.tsx
    if (obj.tool_calls) {
      for (const call of obj.tool_calls) {
        if (call.name === 'write_to_file' || call.name === 'replace_file_content' || call.name === 'multi_replace_file_content') {
          const args = typeof call.args === 'string' ? JSON.parse(call.args) : call.args;
          if (args.TargetFile && args.TargetFile.includes('page.tsx') && !args.TargetFile.includes('projects') && !args.TargetFile.includes('reports') && !args.TargetFile.includes('search')) {
            console.log(`Step ${obj.step_index}: TOOL CALL ${call.name} to ${args.TargetFile}`);
            if (args.CodeContent) {
              console.log(`  CodeContent length: ${args.CodeContent.length}`);
            }
            if (args.ReplacementContent) {
              console.log(`  ReplacementContent length: ${args.ReplacementContent.length}`);
            }
          }
        }
      }
    }
  } catch (e) {}
}
