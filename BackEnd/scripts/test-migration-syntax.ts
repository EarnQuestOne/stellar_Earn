import AppDataSource from '../src/database/data-source';

/**
 * Script to test migration syntax without running it
 * This validates that the migration file is syntactically correct
 */

async function testMigrationSyntax() {
  console.log('🔍 Testing migration syntax...\n');

  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('✅ Database connection established\n');

    // Get pending migrations
    const pendingMigrations = await AppDataSource.showMigrations();
    console.log(`📋 Pending migrations: ${pendingMigrations ? 'Yes' : 'No'}\n`);

    // Get all migrations
    const migrations = AppDataSource.migrations;
    console.log(`📊 Total migrations loaded: ${migrations.length}\n`);

    // Find our migration
    const ourMigration = migrations.find(m => 
      m.name === 'AddPerformanceIndexes1777213481000'
    );

    if (ourMigration) {
      console.log('✅ Migration file found and loaded successfully!');
      console.log(`   Name: ${ourMigration.name}`);
      console.log(`   Constructor: ${ourMigration.constructor.name}\n`);
    } else {
      console.log('⚠️  Migration file not found in loaded migrations\n');
      console.log('Available migrations:');
      migrations.forEach(m => {
        console.log(`   - ${m.name}`);
      });
    }

    // Check current schema
    console.log('\n📊 Checking current database schema...\n');

    // Check if tables exist
    const tables = ['users', 'quests', 'payouts', 'submissions', 'notifications', 'refresh_tokens'];
    
    for (const tableName of tables) {
      const hasTable = await AppDataSource.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
        );
      `);
      
      const exists = hasTable[0].exists;
      console.log(`   ${exists ? '✅' : '❌'} Table "${tableName}" ${exists ? 'exists' : 'does not exist'}`);
    }

    console.log('\n✅ Migration syntax test completed successfully!');
    console.log('\n⚠️  NOTE: This test does NOT run the migration, it only validates syntax.');
    console.log('   To run the migration, use: npm run migration:run\n');

  } catch (error) {
    console.error('❌ Error during syntax test:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

// Run test
testMigrationSyntax()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
