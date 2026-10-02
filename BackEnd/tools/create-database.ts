import { Client } from 'pg';

async function createDatabase() {
  const client = new Client({
    user: 'postgres',
    password: '000000',
    host: 'localhost',
    port: 5432,
    database: 'postgres', // Connect to default postgres database first
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL server');

    // Create stellar_earn database
    await client.query('CREATE DATABASE stellar_earn;');
    console.log('✅ Database "stellar_earn" created successfully!');
  } catch (error) {
    console.error('❌ Error creating database:', error);
    if (error.code === '42P04') {
      console.log('⚠️  Database "stellar_earn" already exists');
    }
  } finally {
    await client.end();
  }
}

createDatabase();
