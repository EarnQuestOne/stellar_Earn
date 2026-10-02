import { Client } from 'pg';

async function testConnection() {
  // Try default postgres user with no password
  console.log('Trying with username: postgres, password: (empty)...');
  const client1 = new Client({
    connectionString: 'postgresql://postgres:@localhost:5432/stellar_earn',
  });

  try {
    await client1.connect();
    console.log(
      '✅ Successfully connected to database with username: postgres, password: (empty)',
    );

    const dbResult1 = await client1.query('SELECT 1');
    console.log('✅ Database query successful');
  } catch (error1) {
    console.error(
      '❌ Connection failed with username: postgres, password: (empty)',
    );
    console.error('Error:', error1.message);

    // Try with postgres user and blank password
    console.log('\nTrying with username: postgres, password: (blank)...');
    const client2 = new Client({
      connectionString: 'postgresql://postgres:@localhost:5432/stellar_earn',
    });

    try {
      await client2.connect();
      console.log(
        '✅ Successfully connected to database with username: postgres, password: (blank)',
      );

      const dbResult2 = await client2.query('SELECT 1');
      console.log('✅ Database query successful');
    } catch (error2) {
      console.error(
        '❌ Connection failed with username: postgres, password: (blank)',
      );
      console.error('Error:', error2.message);

      // Try listing available databases
      console.log('\nTrying to list available databases...');
      const client3 = new Client({
        connectionString: 'postgresql://postgres:@localhost:5432/postgres',
      });

      try {
        await client3.connect();
        console.log('✅ Connected to postgres database');

        const dbList = await client3.query(
          'SELECT datname FROM pg_database WHERE datistemplate = false;',
        );
        console.log(
          'Available databases:',
          dbList.rows.map((row) => row.datname),
        );
      } catch (error3) {
        console.error('❌ Failed to list databases');
        console.error('Error:', error3.message);
      }
    }
  } finally {
    // Close connections
  }
}

testConnection();
