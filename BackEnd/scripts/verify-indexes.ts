import AppDataSource from '../src/database/data-source';

/**
 * Script to verify database indexes after migration
 * 
 * This script:
 * 1. Connects to the database
 * 2. Checks if all expected indexes exist
 * 3. Reports index statistics
 * 4. Identifies any missing or unexpected indexes
 */

interface IndexInfo {
  schemaname: string;
  tablename: string;
  indexname: string;
  indexdef: string;
}

interface IndexStats {
  schemaname: string;
  tablename: string;
  indexname: string;
  idx_scan: number;
  idx_tup_read: number;
  idx_tup_fetch: number;
  size: string;
}

const EXPECTED_INDEXES = {
  users: [
    'IDX_USER_STELLAR_ADDRESS',
    'IDX_USER_EMAIL',
    'IDX_USER_USERNAME',
    'IDX_USER_GOOGLE_ID',
    'IDX_USER_GITHUB_ID',
    'IDX_USER_LAST_ACTIVE_AT',
    'IDX_USER_CREATED_AT',
    'IDX_USER_ROLE_DELETED',
    'IDX_USER_CREATED_DELETED',
  ],
  quests: [
    'IDX_QUEST_STATUS',
    'IDX_QUEST_CREATED_BY',
    'IDX_QUEST_CREATED_AT',
    'IDX_QUEST_DEADLINE',
    'IDX_QUEST_CONTRACT_TASK_ID',
    'IDX_QUEST_STATUS_DEADLINE',
    'IDX_QUEST_CREATOR_STATUS',
    'IDX_QUEST_DELETED_AT',
    'IDX_QUEST_CREATED_STATUS',
  ],
  payouts: [
    'IDX_PAYOUT_STELLAR_ADDRESS',
    'IDX_PAYOUT_STATUS',
    'IDX_PAYOUT_TYPE',
    'IDX_PAYOUT_QUEST_ID',
    'IDX_PAYOUT_SUBMISSION_ID',
    'IDX_PAYOUT_TRANSACTION_HASH',
    'IDX_PAYOUT_NEXT_RETRY_AT',
    'IDX_PAYOUT_CREATED_AT',
    'IDX_PAYOUT_PROCESSED_AT',
    'IDX_PAYOUT_ADDRESS_STATUS',
    'IDX_PAYOUT_STATUS_RETRY',
    'IDX_PAYOUT_QUEST_STATUS',
  ],
  notifications: [
    'IDX_NOTIFICATION_USER_ID',
    'IDX_NOTIFICATION_READ',
    'IDX_NOTIFICATION_CREATED_AT',
    'IDX_NOTIFICATION_TYPE',
    'IDX_NOTIFICATION_PRIORITY',
    'IDX_NOTIFICATION_USER_READ_CREATED',
    'IDX_NOTIFICATION_USER_TYPE',
  ],
  submissions: [
    'IDX_SUBMISSION_QUEST_ID',
    'IDX_SUBMISSION_USER_ID',
    'IDX_SUBMISSION_STATUS',
    'IDX_SUBMISSION_CREATED_AT',
    'IDX_SUBMISSION_APPROVED_AT',
    'IDX_SUBMISSION_REJECTED_AT',
    'IDX_SUBMISSION_USER_STATUS_CREATED',
    'IDX_SUBMISSION_QUEST_STATUS_CREATED',
    'IDX_SUBMISSION_STATUS_CREATED',
  ],
  refresh_tokens: [
    'IDX_REFRESH_TOKEN_TOKEN',
    'IDX_REFRESH_TOKEN_STELLAR_ADDRESS',
    'IDX_REFRESH_TOKEN_FAMILY_ID',
    'IDX_REFRESH_TOKEN_IS_REVOKED',
    'IDX_REFRESH_TOKEN_EXPIRES_AT',
    'IDX_REFRESH_TOKEN_USER_REVOKED_EXPIRES',
    'IDX_REFRESH_TOKEN_FAMILY_REVOKED',
  ],
  two_factor_auth: [
    'IDX_TWO_FACTOR_ENABLED',
  ],
  event_store: [
    'IDX_EVENT_STORE_EVENT_NAME',
    'IDX_EVENT_STORE_TIMESTAMP',
    'IDX_EVENT_STORE_NAME_TIMESTAMP',
  ],
  notification_preferences: [
    'IDX_NOTIFICATION_PREF_ENABLED',
    'IDX_NOTIFICATION_PREF_USER_ENABLED',
  ],
  job_logs: [
    'IDX_JOB_LOGS_STATUS',
    'IDX_JOB_LOGS_JOB_TYPE',
    'IDX_JOB_LOG_USER_ID',
    'IDX_JOB_LOG_CREATED_AT',
  ],
};

async function verifyIndexes() {
  console.log('🔍 Starting index verification...\n');

  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('✅ Database connection established\n');

    // Get all indexes
    const indexes = await AppDataSource.query<IndexInfo[]>(`
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `);

    console.log(`📊 Found ${indexes.length} total indexes\n`);

    // Check each table
    let missingCount = 0;
    let foundCount = 0;

    for (const [tableName, expectedIndexes] of Object.entries(EXPECTED_INDEXES)) {
      console.log(`\n📋 Table: ${tableName}`);
      console.log('─'.repeat(60));

      const tableIndexes = indexes.filter(idx => idx.tablename === tableName);
      const tableIndexNames = tableIndexes.map(idx => idx.indexname.toUpperCase());

      for (const expectedIndex of expectedIndexes) {
        const exists = tableIndexNames.some(name => name === expectedIndex.toUpperCase());
        
        if (exists) {
          console.log(`  ✅ ${expectedIndex}`);
          foundCount++;
        } else {
          console.log(`  ❌ MISSING: ${expectedIndex}`);
          missingCount++;
        }
      }

      // Check for unexpected indexes
      const expectedSet = new Set(expectedIndexes.map(idx => idx.toUpperCase()));
      const unexpectedIndexes = tableIndexes.filter(
        idx => !expectedSet.has(idx.indexname.toUpperCase()) && 
               !idx.indexname.includes('_pkey') // Exclude primary keys
      );

      if (unexpectedIndexes.length > 0) {
        console.log('\n  ℹ️  Additional indexes:');
        unexpectedIndexes.forEach(idx => {
          console.log(`     - ${idx.indexname}`);
        });
      }
    }

    // Summary
    console.log('\n\n' + '='.repeat(60));
    console.log('📈 VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Found: ${foundCount} indexes`);
    console.log(`❌ Missing: ${missingCount} indexes`);
    console.log(`📊 Total Expected: ${foundCount + missingCount} indexes`);

    if (missingCount === 0) {
      console.log('\n🎉 All expected indexes are present!');
    } else {
      console.log('\n⚠️  Some indexes are missing. Please run the migration.');
    }

    // Get index statistics
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 INDEX STATISTICS');
    console.log('='.repeat(60));

    const stats = await AppDataSource.query<IndexStats[]>(`
      SELECT
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch,
        pg_size_pretty(pg_relation_size(indexrelid)) AS size
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY pg_relation_size(indexrelid) DESC
      LIMIT 20;
    `);

    console.log('\nTop 20 Largest Indexes:');
    console.log('─'.repeat(100));
    console.log(
      'Table'.padEnd(25) +
      'Index'.padEnd(40) +
      'Size'.padEnd(12) +
      'Scans'.padEnd(10)
    );
    console.log('─'.repeat(100));

    stats.forEach(stat => {
      console.log(
        stat.tablename.padEnd(25) +
        stat.indexname.padEnd(40) +
        stat.size.padEnd(12) +
        stat.idx_scan.toString().padEnd(10)
      );
    });

    // Check for unused indexes
    const unusedIndexes = await AppDataSource.query<IndexStats[]>(`
      SELECT
        schemaname,
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) AS size
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
        AND idx_scan = 0
        AND indexrelid NOT IN (
          SELECT conindid FROM pg_constraint WHERE contype IN ('p', 'u')
        )
      ORDER BY pg_relation_size(indexrelid) DESC;
    `);

    if (unusedIndexes.length > 0) {
      console.log('\n\n⚠️  UNUSED INDEXES (0 scans):');
      console.log('─'.repeat(80));
      unusedIndexes.forEach(idx => {
        console.log(`  ${idx.tablename}.${idx.indexname} (${idx.size})`);
      });
      console.log('\nNote: Newly created indexes may show 0 scans initially.');
    } else {
      console.log('\n\n✅ No unused indexes found');
    }

    // Index hit rate
    const hitRate = await AppDataSource.query<{ index_hit_rate: number }[]>(`
      SELECT
        ROUND(
          sum(idx_blks_hit)::numeric / 
          NULLIF(sum(idx_blks_hit + idx_blks_read), 0) * 100,
          2
        ) AS index_hit_rate
      FROM pg_statio_user_indexes;
    `);

    if (hitRate[0]?.index_hit_rate) {
      console.log('\n\n📈 INDEX HIT RATE');
      console.log('─'.repeat(60));
      console.log(`  ${hitRate[0].index_hit_rate}%`);
      
      if (hitRate[0].index_hit_rate >= 99) {
        console.log('  ✅ Excellent! Indexes are being used effectively.');
      } else if (hitRate[0].index_hit_rate >= 95) {
        console.log('  ✓ Good. Indexes are performing well.');
      } else {
        console.log('  ⚠️  Consider reviewing query patterns and index usage.');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Verification complete!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

// Run verification
verifyIndexes()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
