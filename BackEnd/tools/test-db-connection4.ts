import { Client } from 'pg';

async function testConnection() {
  // Try common PostgreSQL defaults
  console.log('Trying with username: postgres, password: postgres...');
  const client1 = new Client({
    connectionString:
      'postgresql://postgres:postgres@localhost:5432/stellar_earn',
  });

  try {
    await client1.connect();
    console.log(
      '✅ Successfully connected to database with username: postgres, password: postgres',
    );

    const dbResult1 = await client1.query('SELECT 1');
    console.log('✅ Database query successful');
  } catch (error1) {
    console.error(
      '❌ Connection failed with username: postgres, password: postgres',
    );
    console.error('Error:', error1.message);

    // Try with postgres user and no password (if configured for trust authentication)
    console.log('\nTrying with username: postgres, password: (none)...');
    const client2 = new Client({
      connectionString: 'postgresql://postgres:@localhost:5432/stellar_earn',
    });

    try {
      await client2.connect();
      console.log(
        '✅ Successfully connected to database with username: postgres, password: (none)',
      );

      const dbResult2 = await client2.query('SELECT 1');
      console.log('✅ Database query successful');
    } catch (error2) {
      console.error(
        '❌ Connection failed with username: postgres, password: (none)',
      );
      console.error('Error:', error2.message);

      console.log('\nPlease check your PostgreSQL installation:');
      console.log('- Is PostgreSQL installed and running?');
      console.log('- What are the correct credentials?');
      console.log('- Is the stellar_earn database created?');
      console.log('- Check pg_hba.conf for authentication method');
    }
  } finally {
    // Close connections
  }
}

testConnection();
