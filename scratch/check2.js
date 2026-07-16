const fs = require('fs');
const txt = fs.readFileSync('C:/Users/1wasp/.gemini/antigravity-ide/brain/503714a1-8837-43bc-92cb-eb63f972fa25/.system_generated/steps/950/output.txt', 'utf8');
const match = txt.match(/<div class=\\\\"sec-title\\\\">효소 처리 가능성 \(KEGG\)<\/div>[\s\S]{0,1000}/);
console.log(match ? match[0] : 'Not found');
