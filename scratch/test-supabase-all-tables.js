const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey || supabaseAnonKey);

async function testAllTables() {
  const tables = [
    'wards',
    'education_indicators',
    'road_indicators',
    'water_indicators',
    'health_indicators',
    'submissions',
    'extracted_issues',
    'demand_clusters',
    'cluster_mappings',
    'projects',
    'decision_logs'
  ];

  console.log('Verifying tables in Supabase database...');
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`Table "${table}": Error ->`, error.message);
      } else {
        console.log(`Table "${table}": Success -> Exist (Head count: ${count})`);
      }
    } catch (err) {
      console.log(`Table "${table}": Crash ->`, err.message);
    }
  }
}

testAllTables();
