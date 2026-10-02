import { Client } from 'pg';

async function markInitialMigration() {
  console.log('Marking initial schema migration as applied...');

  const client = new Client({
    connectionString:
      'postgresql://postgres:000000@localhost:5432/stellar_earn',
  });

  try {
    await client.connect();
    console.log('✅ Connected to stellar_earn database');

    // Insert the initial schema migration
    const result = await client.query(
      'INSERT INTO typeorm_migrations (id, name, timestamp) VALUES ($1, $2, $3)',
      [11, 'InitialSchema1769471764117', Date.now()],
    );
    console.log('✅ Initial schema migration marked as applied');

    // Verify it was inserted
    const check = await client.query(
      "SELECT * FROM typeorm_migrations WHERE name = 'InitialSchema1769471764117'",
    );
    console.log(`Verification: ${check.rowCount} rows found`);
  } catch (error) {
    console.error('❌ Failed to mark initial migration:', error.message);
  } finally {
    await client.end();
  }
}

markInitialMigration();
