// db/test-conn.js
const { Client } = require('pg');

async function test() {
  const client = new Client({
    host: '2406:da1a:82a:9d01:eb3e:e014:f69e:3f6f',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'buildwithai#123',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Testing direct IPv6 connection...');
    await client.connect();
    console.log('Success! Connected directly to Supabase via IPv6.');
    const res = await client.query('SELECT NOW()');
    console.log('Query result:', res.rows[0]);
  } catch (err) {
    console.error('Connection failed:', err);
  } finally {
    await client.end();
  }
}

test();
