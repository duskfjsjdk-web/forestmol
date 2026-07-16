import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data: users } = await supabase.auth.admin.listUsers();
  if (users.users.length === 0) return console.log('No users');
  const userId = users.users[0].id;
  
  // This might be tricky. Let's just generate a report directly by calling the logic or skip the auth check by modifying the route temporarily.
}
test();
