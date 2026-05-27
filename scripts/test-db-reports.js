const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('reports')
    .select('id, html_content')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (data && data.length > 0) {
    const html = data[0].html_content;
    const startIndex = html.indexOf('대표 구조식');
    if (startIndex !== -1) {
      console.log('HTML Around Structure Formula:');
      console.log(html.substring(startIndex - 50, startIndex + 500));
    } else {
      console.log('대표 구조식 문자열을 HTML에서 찾지 못했습니다.');
    }
  } else {
    console.log('생성된 리포트가 없습니다.');
  }
}

run();
