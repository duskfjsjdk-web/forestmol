const fs = require('fs');

const logFilePath = 'C:/Users/1wasp/.gemini/antigravity-ide/brain/b63c1637-866a-4e43-a1c6-e1f472d55e7a/.system_generated/logs/transcript.jsonl';
const lines = fs.readFileSync(logFilePath, 'utf-8').split('\n');

let latestViewFileContent = null;
let latestViewFileStepIndex = -1;

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    // Ignore steps from the current run (>= 1330)
    if (obj.step_index >= 1330) continue;
    if (obj.content && obj.content.includes('File Path: `file:///c:/Users/1wasp/forestmol/src/app/page.tsx`')) {
      latestViewFileContent = obj.content;
      latestViewFileStepIndex = obj.step_index;
    }
  } catch (e) {}
}

if (latestViewFileContent) {
  console.log(`Found latest VIEW_FILE of page.tsx at step ${latestViewFileStepIndex}`);
  const fileLines = [];
  const contentLines = latestViewFileContent.split('\n');
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
  console.log(`Successfully restored page.tsx from step ${latestViewFileStepIndex}!`);
} else {
  console.log('Could not find any VIEW_FILE of page.tsx before step 1330.');
}
