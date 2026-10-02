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

    // Check if typeorm_migrations table exists
    try {
      const tableCheck = await client.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'typeorm_migrations')",
      );
      if (tableCheck.rows[0].exists) {
        console.log('✅ typeorm_migrations table exists');

        // Get list of applied migrations
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
      } else {
        console.log(
          '❌ typeorm_migrations table does not exist - no migrations have been run',
        );
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
