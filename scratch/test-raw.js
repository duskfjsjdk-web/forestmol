const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/ANTHROPIC_API_KEY=(.*)/);
const key = match ? match[1].trim() : '';

console.log('Key prefix:', key.substring(0, 10));

fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json'
  },
  body: JSON.stringify({
    model: 'claude-3-haiku-20240307',
    max_tokens: 10,
    messages: [{role: 'user', content: 'hi'}]
  })
}).then(res => res.text()).then(console.log).catch(console.error);
