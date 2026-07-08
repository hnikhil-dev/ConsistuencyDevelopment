// db/migrate.js
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// URL-encoded '#' as '%23' and pointing to port 6543 of the IPv4 pooler without parameter override
const connectionString = 'postgresql://postgres.jzgoesysrwioeiujdkdf:buildwithai%23123@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

async function run() {
  const client = new Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false } // Required for Supabase SSL connections
  });
  
  try {
    console.log('Connecting to Supabase PostgreSQL database...');
    await client.connect();
    console.log('Database connection established.');

    console.log('Loading db/schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    
    console.log('Executing database schema creation (applying pgvector, tables, and indices)...');
    await client.query(schemaSql);
    console.log('Database schema applied successfully.');

    console.log('Loading db/seed.sql...');
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    
    console.log('Injecting baseline seed records (wards, category indicators, and initial clusters)...');
    await client.query(seedSql);
    console.log('Baseline seeds injected successfully.');

    console.log('All migrations completed successfully! Live database is ready.');

  } catch (error) {
    console.error('Database migration/setup failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

run();
