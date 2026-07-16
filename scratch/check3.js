const fs = require('fs');
const txt = fs.readFileSync('C:/Users/1wasp/.gemini/antigravity-ide/brain/503714a1-8837-43bc-92cb-eb63f972fa25/.system_generated/steps/950/output.txt', 'utf8');
const obj = JSON.parse(txt);
console.log('ID:', obj[0].id);
console.log('Created At:', obj[0].created_at);
