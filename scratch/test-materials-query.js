const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('materials')
    .select('id, name_ko, name, species, scientific_name, bioactivity, compounds, cosmetic_allowed, raw_data, source_org, data_source, patent_count, patents, kegg_id, kegg_pathways, kegg_enzymes')
    .limit(1);

  if (error) {
    console.error('❌ Supabase Query Error:', error.message);
    
    // Let's check which columns are valid by querying one by one or getting table info
    console.log('Querying table structure or running separate column queries...');
    const columns = [
      'id', 'name_ko', 'name', 'species', 'scientific_name', 'bioactivity', 
      'compounds', 'cosmetic_allowed', 'raw_data', 'source_org', 'data_source', 
      'patent_count', 'patents', 'kegg_id', 'kegg_pathways', 'kegg_enzymes'
    ];
    for (const col of columns) {
      const { error: colErr } = await supabase.from('materials').select(col).limit(1);
      if (colErr) {
        console.log(`❌ Column [${col}] fails: ${colErr.message}`);
      } else {
        console.log(`✅ Column [${col}] is valid`);
      }
    }
  } else {
    console.log('✅ Query succeeded!');
  }
}

test();
