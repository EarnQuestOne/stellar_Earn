import { Client } from 'pg';

async function testConnection() {
  const connectionString =
    'postgresql://stellar_Earn:000000@localhost:5432/stellar_earn';

  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log(
      '✅ Successfully connected to database with username: stellar_Earn, password: 000000',
    );

    // Test if database exists
    const dbResult = await client.query('SELECT 1');
    console.log('✅ Database query successful');
  } catch (error) {
    console.error(
      '❌ Connection failed with username: stellar_Earn, password: 000000',
    );
    console.error('Error:', error.message);

    // Try with 123456 password
    console.log('\nTrying with password: 123456...');
    const client2 = new Client({
      connectionString:
        'postgresql://stellar_Earn:123456@localhost:5432/stellar_earn',
    });

    try {
      await client2.connect();
      console.log(
        '✅ Successfully connected to database with username: stellar_Earn, password: 123456',
      );

      const dbResult2 = await client2.query('SELECT 1');
      console.log('✅ Database query successful');
    } catch (error2) {
      console.error(
        '❌ Connection failed with username: stellar_Earn, password: 123456',
      );
      console.error('Error:', error2.message);

      // Also try the current postgres user with 123456
      console.log('\nTrying with username: postgres, password: 123456...');
      const client3 = new Client({
        connectionString:
          'postgresql://postgres:123456@localhost:5432/stellar_earn',
      });

      try {
        await client3.connect();
        console.log(
          '✅ Successfully connected to database with username: postgres, password: 123456',
        );

        const dbResult3 = await client3.query('SELECT 1');
        console.log('✅ Database query successful');
      } catch (error3) {
        console.error(
          '❌ Connection failed with username: postgres, password: 123456',
        );
        console.error('Error:', error3.message);
      }
    }
  } finally {
    await client.end();
  }
}

testConnection();
