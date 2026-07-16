const fs = require('fs');
const txt = fs.readFileSync('C:/Users/1wasp/.gemini/antigravity-ide/brain/503714a1-8837-43bc-92cb-eb63f972fa25/.system_generated/steps/914/output.txt', 'utf8');
const idx = txt.indexOf('효소 처리 가능성');
console.log(txt.substring(idx - 100, idx + 1000));
