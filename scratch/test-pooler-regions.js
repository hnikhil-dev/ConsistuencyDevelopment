const { Client } = require('pg');

const regions = [
  'ap-south-1',     // Mumbai
  'ap-southeast-1', // Singapore
  'ap-southeast-2', // Sydney
  'ap-northeast-1', // Tokyo
  'us-east-1',      // N. Virginia
  'us-east-2',      // Ohio
  'us-west-1',      // N. California
  'us-west-2',      // Oregon
  'eu-central-1',   // Frankfurt
  'eu-west-1',      // Ireland
  'eu-west-2',      // London
  'eu-west-3',      // Paris
  'sa-east-1',      // Sao Paulo
  'ca-central-1'    // Canada Central
];

async function testRegions() {
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const connectionString = `postgresql://postgres.jzgoesysrwioeiujdkdf:buildwithai%23123@${host}:6543/postgres`;
    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000 // 5 seconds timeout
    });

    console.log(`Testing region: ${region} (${host})...`);
    try {
      await client.connect();
      console.log(`\n>>> SUCCESS! Connected successfully using region: ${region} <<<\n`);
      const res = await client.query('SELECT NOW()');
      console.log('Query result:', res.rows[0]);
      await client.end();
      return; // Stop after finding the working one
    } catch (err) {
      console.log(`Failed for region ${region}:`, err.message);
    }
  }
  console.log('\nAll tested regions failed.');
}

testRegions();
