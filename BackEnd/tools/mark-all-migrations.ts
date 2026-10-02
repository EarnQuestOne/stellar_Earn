import { Client } from 'pg';

async function markAllMigrations() {
  console.log('Marking all remaining migrations as applied...');

  const client = new Client({
    connectionString:
      'postgresql://postgres:000000@localhost:5432/stellar_earn',
  });

  try {
    await client.connect();
    console.log('✅ Connected to stellar_earn database');

    // List of remaining migration IDs to mark as applied
    const migrationIds = [
      [12, 'AddOauthSupport1769471764118'],
      [13, 'AddTwoFactorAuth1769471764118'],
      [14, 'AddSoftDeletes1777056872715'],
      [15, 'AddPerformanceIndexes1777213481000'],
      [16, 'AddCursorPaginationIndexes1746000000000'],
    ];

    for (const [id, name] of migrationIds) {
      try {
        await client.query(
          'INSERT INTO typeorm_migrations (id, name, timestamp) VALUES ($1, $2, $3)',
          [id, name, Date.now()],
        );
        console.log(`✅ ${name} marked as applied`);
      } catch (error) {
        // Skip if already exists
        if (error.message.includes('duplicate key')) {
          console.log(`⚠️  ${name} already exists in migrations table`);
        } else {
          console.error(`❌ Failed to mark ${name}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
  } finally {
    await client.end();
  }
}

markAllMigrations();
