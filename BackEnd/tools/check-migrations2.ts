import { Client } from 'pg';

async function checkMigrations() {
  console.log('Checking which migrations have been applied...');

  const client = new Client({
    connectionString:
      'postgresql://postgres:000000@localhost:5432/stellar_earn',
  });

  try {
    await client.connect();
    console.log('✅ Connected to stellar_earn database');

    // Get list of applied migrations
    try {
      const migrations = await client.query(
        'SELECT * FROM typeorm_migrations ORDER BY id DESC',
      );
      console.log(`Applied migrations count: ${migrations.rowCount}`);
      if (migrations.rowCount > 0) {
        console.log(
          'Applied migrations:',
          migrations.rows.map((row) => row.name),
        );
      } else {
        console.log('❌ No migrations have been applied yet');
      }
    } catch (error) {
      console.error('❌ Error checking migrations table:', error.message);
      console.log('This likely means no migrations have been run yet');
    }
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    console.log(
      'Please verify PostgreSQL is running and credentials are correct',
    );
  } finally {
    await client.end();
  }
}

checkMigrations();
