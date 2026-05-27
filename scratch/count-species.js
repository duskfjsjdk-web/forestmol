const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Users\\1wasp\\.gemini\\antigravity-ide\\brain\\00089f8f-8a14-48b2-88b8-a6ed2ade9a19\\.system_generated\\steps\\740\\output.txt';
const mdPath = path.join(process.cwd(), 'scratch', 'result.md');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/\\/g, '');

  const regex = /"species"\s*:\s*"([^"]+)"/g;
  const speciesList = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    speciesList.push(match[1]);
  }

  const uniqueList = Array.from(new Set(speciesList)).sort();

  let mdContent = `### 📋 materials 테이블 학명(species) 고유값 목록 (총 ${uniqueList.length}건)\n\n`;
  mdContent += `> [!NOTE]\n`;
  mdContent += `> 데이터베이스 창고 내에 등록된 식물들의 고유한 학명(국제 표준 식물 이름) 목록입니다.\n\n`;
  mdContent += `<details>\n`;
  mdContent += `<summary>👇 클릭하여 전체 학명 목록 펼치기 (${uniqueList.length}개)</summary>\n\n`;
  mdContent += `\`\`\`text\n`;
  uniqueList.forEach(name => {
    mdContent += `${name}\n`;
  });
  mdContent += `\`\`\`\n\n`;
  mdContent += `</details>\n`;

  fs.writeFileSync(mdPath, mdContent, 'utf8');
  console.log('마크다운 파일 생성 완료:', mdPath);
} catch (err) {
  console.error('에러 발생:', err);
}
