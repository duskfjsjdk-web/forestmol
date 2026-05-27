const fs = require('fs');
const path = require('path');

const logFilePath = 'C:/Users/1wasp/.gemini/antigravity-ide/brain/b63c1637-866a-4e43-a1c6-e1f472d55e7a/.system_generated/logs/transcript.jsonl';

const lines = fs.readFileSync(logFilePath, 'utf-8').split('\n');

let latestContent = null;
let latestStepIndex = -1;

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    // Look for a VIEW_FILE or log content that contains page.tsx content.
    // Let's also support matching files written to page.tsx
    if (obj.content && obj.content.includes('File Path: `file:///c:/Users/1wasp/forestmol/src/app/page.tsx`')) {
      latestContent = obj.content;
      latestStepIndex = obj.step_index;
    }
  } catch (e) {
    // ignore
  }
}

if (latestContent) {
  console.log(`Found content at step_index ${latestStepIndex}`);
  const fileLines = [];
  const contentLines = latestContent.split('\n');
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
  console.log('Restored page.tsx successfully!');
} else {
  console.log('Could not find page.tsx content in transcript.');
}
