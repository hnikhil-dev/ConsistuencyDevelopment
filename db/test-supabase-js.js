// db/test-supabase-js.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function test() {
  console.log('Testing Supabase JS Client connection...');
  console.log('URL:', supabaseUrl);
  
  // Use service role client for bypass RLS checks during test
  const supabase = createClient(supabaseUrl, serviceKey || supabaseAnonKey);

  try {
    // Try to select wards (if table exists)
    console.log('Fetching wards table...');
    const { data, error } = await supabase.from('wards').select('*');
    
    if (error) {
      console.log('Connection successful, but table error (likely because migrations have not been run in the SQL Editor yet):', error.message);
    } else {
      console.log('Success! Connected and fetched wards:', data);
    }
  } catch (err) {
    console.error('JS Client connection crashed:', err);
  }
}

test();
