import { Client } from 'pg';

async function checkMigrationsTable() {
  console.log('Checking typeorm_migrations table structure...');

  const client = new Client({
    connectionString:
      'postgresql://postgres:000000@localhost:5432/stellar_earn',
  });

  try {
    await client.connect();
    console.log('✅ Connected to stellar_earn database');

    // Get table structure
    try {
      const structure = await client.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'typeorm_migrations' ORDER BY ordinal_position",
      );
      console.log('typeorm_migrations table structure:');
      structure.rows.forEach((row) =>
        console.log(`  ${row.column_name}: ${row.data_type}`),
      );
    } catch (error) {
      console.error('❌ Error checking table structure:', error.message);
    }
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
  } finally {
    await client.end();
  }
}

checkMigrationsTable();
