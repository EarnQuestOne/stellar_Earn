#!/usr/bin/env ts-node

import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../src/database/data-source';
import * as process from 'process';

/**
 * Rollback script for two-step migrations
 * Usage: npm run migration:rollback:two-step
 */
async function rollbackMigrations() {
  console.log('Starting rollback of two-step migrations...');
  
  const dataSource = new DataSource(dataSourceOptions);
  
  try {
    await dataSource.initialize();
    console.log('Database connection established');
    
    // Get the migration table to see what migrations have been run
    const migrationTable = await dataSource.query(`
      SELECT * FROM "typeorm_migrations" 
      WHERE "name" LIKE '%DataMigrationStep%' 
      ORDER BY "timestamp" DESC
    `);
    
    if (migrationTable.length === 0) {
      console.log('No data migrations found to rollback');
      return;
    }
    
    console.log(`Found ${migrationTable.length} data migration(s) to rollback`);
    
    // Rollback Step 2 first (data migration)
    const step2Migration = migrationTable.find((m: any) => m.name.includes('DataMigrationStep2'));
    if (step2Migration) {
      console.log('Rolling back Step 2: Data migration...');
      await dataSource.query(`
        DELETE FROM "typeorm_migrations" 
        WHERE "name" = '${step2Migration.name}'
      `);
      console.log('Step 2 rollback completed');
    }
    
    // Rollback Step 1 second (schema sync)
    const step1Migration = migrationTable.find((m: any) => m.name.includes('DataMigrationStep1'));
    if (step1Migration) {
      console.log('Rolling back Step 1: Schema synchronization...');
      await dataSource.query(`
        DELETE FROM "typeorm_migrations" 
        WHERE "name" = '${step1Migration.name}'
      `);
      console.log('Step 1 rollback completed');
    }
    
    console.log('Rollback completed successfully');
    
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

// Manual rollback execution
async function manualRollback() {
  console.log('Starting manual rollback of two-step migrations...');
  
  const dataSource = new DataSource(dataSourceOptions);
  
  try {
    await dataSource.initialize();
    console.log('Database connection established');
    
    // Manual rollback of Step 2
    console.log('Manually rolling back Step 2: Data migration...');
    
    // Drop foreign key constraints
    const constraints = [
      'FK_submissions_user',
      'FK_quests_creator', 
      'FK_submissions_quest',
      'FK_notifications_user',
      'FK_refresh_tokens_user'
    ];

    for (const constraint of constraints) {
      try {
        await dataSource.query(`ALTER TABLE DROP CONSTRAINT IF EXISTS "${constraint}"`);
        console.log(`Dropped constraint: ${constraint}`);
      } catch (error) {
        console.log(`Constraint ${constraint} does not exist or cannot be dropped`);
      }
    }

    // Drop indexes
    const indexes = [
      'IDX_users_username',
      'IDX_users_email',
      'IDX_quests_status',
      'IDX_quests_createdBy',
      'IDX_submissions_status',
      'IDX_submissions_userId',
      'IDX_submissions_questId',
      'IDX_payouts_status',
      'IDX_payouts_stellarAddress',
      'IDX_payouts_questId',
      'IDX_payouts_submissionId'
    ];

    for (const index of indexes) {
      try {
        await dataSource.query(`DROP INDEX IF EXISTS "${index}"`);
        console.log(`Dropped index: ${index}`);
      } catch (error) {
        console.log(`Index ${index} does not exist or cannot be dropped`);
      }
    }

    // Reset calculated fields
    await dataSource.query(`
      UPDATE "users" 
      SET 
        "questsCompleted" = 0,
        "failedQuests" = 0,
        "successRate" = 0,
        "totalEarned" = '0',
        "lastActiveAt" = NULL
    `);

    console.log('Step 2 manual rollback completed');
    
    // Manual rollback of Step 1
    console.log('Manually rolling back Step 1: Schema synchronization...');
    
    // Reverse table renames if needed
    const tables = [
      { old: 'users', new: 'User' },
      { old: 'quests', new: 'Quest' },
      { old: 'submissions', new: 'Submission' },
      { old: 'notifications', new: 'Notification' },
      { old: 'payouts', new: 'Payout' },
      { old: 'refresh_tokens', new: 'RefreshToken' }
    ];

    for (const table of tables) {
      try {
        const tableExists = await dataSource.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = '${table.old}'
          )
        `);
        
        if (tableExists[0].exists && !(await dataSource.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = '${table.new}'
          )
        `)).then((r: any) => r[0].exists)) {
          await dataSource.query(`ALTER TABLE "${table.old}" RENAME TO "${table.new}"`);
          console.log(`Renamed ${table.old} to ${table.new}`);
        }
      } catch (error) {
        console.log(`Could not rename ${table.old} to ${table.new}`);
      }
    }

    // Remove from migration table
    await dataSource.query(`
      DELETE FROM "typeorm_migrations" 
      WHERE "name" LIKE '%DataMigrationStep%'
    `);

    console.log('Step 1 manual rollback completed');
    console.log('Manual rollback completed successfully');
    
  } catch (error) {
    console.error('Manual rollback failed:', error);
    throw error;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

// Check if this file is being run directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'manual') {
    manualRollback().catch(console.error);
  } else {
    rollbackMigrations().catch(console.error);
  }
}

export { rollbackMigrations, manualRollback };
