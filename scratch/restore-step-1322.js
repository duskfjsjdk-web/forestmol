const fs = require('fs');

const logFilePath = 'C:/Users/1wasp/.gemini/antigravity-ide/brain/b63c1637-866a-4e43-a1c6-e1f472d55e7a/.system_generated/logs/transcript.jsonl';
const lines = fs.readFileSync(logFilePath, 'utf-8').split('\n');

let targetStep = 1322; // Step 1322 was the last VIEW_FILE of page.tsx before it got reset.
let content = null;

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.step_index === targetStep) {
      content = obj.content;
      break;
    }
  } catch (e) {}
}

if (content) {
  const fileLines = [];
  const contentLines = content.split('\n');
  let startSaving = false;
  for (const cLine of contentLines) {
    if (cLine.includes('The following code has been modified to include a line number before every line')) {
      startSaving = true;
      continue;
    }
    if (startSaving) {
      if (cLine.startsWith('The above content')) {
        break;
      }
      const match = cLine.match(/^\d+:\s?(.*)$/);
      if (match) {
        fileLines.push(match[1]);
      } else {
        fileLines.push(cLine);
      }
    }
  }
  
  fs.writeFileSync('C:/Users/1wasp/forestmol/src/app/page.tsx', fileLines.join('\n'), 'utf-8');
  console.log(`Successfully restored page.tsx from step ${targetStep}!`);
} else {
  console.log(`Could not find step ${targetStep}`);
}
