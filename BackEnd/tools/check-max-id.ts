import { Client } from 'pg';

async function checkMaxId() {
  console.log('Checking current max id in typeorm_migrations...');

  const client = new Client({
    connectionString:
      'postgresql://postgres:000000@localhost:5432/stellar_earn',
  });

  try {
    await client.connect();
    console.log('✅ Connected to stellar_earn database');

    // Get current max id
    try {
      const maxId = await client.query(
        'SELECT MAX(id) as max_id FROM typeorm_migrations',
      );
      console.log(`Current max id: ${maxId.rows[0].max_id}`);
    } catch (error) {
      console.error('❌ Error checking max id:', error.message);
    }
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
  } finally {
    await client.end();
  }
}

checkMaxId();
