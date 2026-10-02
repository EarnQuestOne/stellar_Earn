import { Client } from 'pg';

async function testConnection() {
  // Try credentials from docker-compose.yml
  console.log('Trying with username: user, password: password...');
  const client1 = new Client({
    connectionString: 'postgresql://user:password@localhost:5432/stellar_earn',
  });

  try {
    await client1.connect();
    console.log(
      '✅ Successfully connected to database with username: user, password: password',
    );

    const dbResult1 = await client1.query('SELECT 1');
    console.log('✅ Database query successful');
  } catch (error1) {
    console.error(
      '❌ Connection failed with username: user, password: password',
    );
    console.error('Error:', error1.message);

    // Try connecting to the postgres database first to check if server is running
    console.log('\nTrying to connect to postgres database (default)...');
    const client2 = new Client({
      connectionString: 'postgresql://user:password@localhost:5432/postgres',
    });

    try {
      await client2.connect();
      console.log('✅ Connected to postgres database');

      const dbList = await client2.query(
        'SELECT datname FROM pg_database WHERE datistemplate = false;',
      );
      console.log(
        'Available databases:',
        dbList.rows.map((row) => row.datname),
      );
    } catch (error2) {
      console.error('❌ Failed to connect to postgres database');
      console.error('Error:', error2.message);
      console.log(
        '\nPlease make sure PostgreSQL is running. Try starting it with:',
      );
      console.log('  docker-compose up -d postgres');
      console.log('  or');
      console.log('  docker-compose up -d');
    }
  } finally {
    // Close connections
  }
}

testConnection();
