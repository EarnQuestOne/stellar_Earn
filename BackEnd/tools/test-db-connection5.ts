import { Client } from 'pg';

async function testConnection() {
  // Try common Windows PostgreSQL configurations

  // First, try postgres user with common passwords
  const passwords = ['postgres', 'admin', '123456', '000000', 'password'];

  for (const password of passwords) {
    console.log(`\nTrying with username: postgres, password: ${password}...`);
    const client = new Client({
      connectionString: `postgresql://postgres:${password}@localhost:5432/stellar_earn`,
      connectionTimeoutMillis: 5000,
    });

    try {
      await client.connect();
      console.log(
        `✅ Successfully connected to database with username: postgres, password: ${password}`,
      );

      const dbResult = await client.query('SELECT 1');
      console.log('✅ Database query successful');
      return; // Exit after success
    } catch (error) {
      console.error(
        `❌ Connection failed with username: postgres, password: ${password}`,
      );
      console.error('Error:', error.message);
    } finally {
      await client.end();
    }
  }

  // If none of the common passwords work, try connecting to postgres database to list available databases
  console.log(
    '\nTrying to connect to postgres database to list available databases...',
  );
  const client2 = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres',
    connectionTimeoutMillis: 5000,
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
  } catch (error) {
    console.error('❌ Failed to connect to postgres database');
    console.error('Error:', error.message);
    console.log('\nPlease check your PostgreSQL installation:');
    console.log('- What password did you set during PostgreSQL installation?');
    console.log('- Is the stellar_earn database created?');
    console.log(
      '- You can use pgAdmin or psql to check and create the database',
    );
  } finally {
    await client2.end();
  }
}

testConnection();
