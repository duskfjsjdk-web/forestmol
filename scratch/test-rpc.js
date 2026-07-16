const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=\"?([^\"\r\n]*)\"?/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=\"?([^\"\r\n]*)\"?/);

if (urlMatch && keyMatch) {
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  supabase.rpc('match_materials', { query_embedding: new Array(768).fill(0), match_threshold: -1, match_count: 1 })
    .then(res => {
      if (res.error) console.error(res.error);
      else console.log(Object.keys(res.data[0] || {}));
    })
    .catch(console.error);
} else {
  console.log('Env error');
}
