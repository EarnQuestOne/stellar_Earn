import { Client } from 'pg';

async function checkDatabaseStructure() {
  console.log('Checking database structure...');

  const client = new Client({
    connectionString:
      'postgresql://postgres:000000@localhost:5432/stellar_earn',
  });

  try {
    await client.connect();
    console.log('✅ Connected to stellar_earn database');

    // Check if any tables exist
    try {
      const tables = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
      );
      if (tables.rowCount === 0) {
        console.log('✅ Database is empty - no tables found');
      } else {
        console.log(`Found ${tables.rowCount} tables:`);
        tables.rows.forEach((row) => console.log(`  - ${row.table_name}`));
      }
    } catch (error) {
      console.error('❌ Error checking tables:', error.message);
      console.log('This might mean the database is not properly initialized');
    }
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    console.log(
      'Please verify PostgreSQL is running and credentials are correct',
    );

    // Try connecting to postgres database instead
    console.log('\nTrying to connect to default postgres database...');
    const client2 = new Client({
      connectionString: 'postgresql://postgres:000000@localhost:5432/postgres',
    });

    try {
      await client2.connect();
      console.log('✅ Connected to postgres database');

      // List available databases
      const dbList = await client2.query(
        'SELECT datname FROM pg_database WHERE datistemplate = false;',
      );
      console.log(
        'Available databases:',
        dbList.rows.map((row) => row.datname),
      );
    } catch (error2) {
      console.error(
        '❌ Failed to connect to postgres database:',
        error2.message,
      );
      console.log('\nPlease check your PostgreSQL installation:');
      console.log(
        '- Is PostgreSQL service running? (you can check in Windows Services)',
      );
      console.log('- Are the credentials correct?');
      console.log('- Does the stellar_earn database exist?');
    }
  } finally {
    await client.end();
  }
}

checkDatabaseStructure();
