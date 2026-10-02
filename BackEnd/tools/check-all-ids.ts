import { Client } from 'pg';

async function checkAllIds() {
  console.log('Checking all ids in typeorm_migrations...');

  const client = new Client({
    connectionString:
      'postgresql://postgres:000000@localhost:5432/stellar_earn',
  });

  try {
    await client.connect();
    console.log('✅ Connected to stellar_earn database');

    // Get all ids and names
    try {
      const allIds = await client.query(
        'SELECT id, name, timestamp FROM typeorm_migrations ORDER BY id',
      );
      console.log(`All migrations:`);
      allIds.rows.forEach((row) =>
        console.log(
          `  ${row.id}: ${row.name} (${new Date(row.timestamp).toISOString()})`,
        ),
      );
    } catch (error) {
      console.error('❌ Error checking all ids:', error.message);
    }
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
  } finally {
    await client.end();
  }
}

checkAllIds();
