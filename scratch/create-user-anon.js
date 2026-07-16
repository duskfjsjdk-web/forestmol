const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('No credentials found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function signup() {
  console.log('Attempting signup for test@forestmol.com...');
  const { data, error } = await supabase.auth.signUp({
    email: 'test@forestmol.com',
    password: 'test2026!'
  });
  if (error) {
    console.error('Signup error:', error.message);
    process.exit(1);
  } else {
    console.log('Signup success:', data.user ? data.user.id : 'No user data');
    process.exit(0);
  }
}

signup();
