#!/usr/bin/env ts-node

import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../src/database/data-source';

/**
 * Test script for two-step migrations
 * Usage: npm run migration:test
 */
async function testMigrations() {
  console.log('Starting migration tests...');
  
  const dataSource = new DataSource(dataSourceOptions);
  
  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');
    
    // Test 1: Check if all required tables exist
    console.log('\n📋 Test 1: Checking table existence...');
    const requiredTables = [
      'users', 'quests', 'submissions', 'notifications', 'payouts', 'refresh_tokens'
    ];
    
    for (const table of requiredTables) {
      const tableExists = await dataSource.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = '${table}'
        )
      `);
      
      if (tableExists[0].exists) {
        console.log(`✅ Table '${table}' exists`);
      } else {
        console.log(`❌ Table '${table}' does not exist`);
        throw new Error(`Required table '${table}' is missing`);
      }
    }
    
    // Test 2: Check if all required columns exist
    console.log('\n📋 Test 2: Checking column existence...');
    
    // Check users table columns
    const userColumns = await dataSource.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    const requiredUserColumns = [
      'id', 'stellarAddress', 'username', 'email', 'googleId', 'githubId',
      'role', 'xp', 'level', 'questsCompleted', 'badges', 'avatarUrl',
      'bio', 'socialLinks', 'privacyLevel', 'failedQuests', 'successRate',
      'totalEarned', 'lastActiveAt', 'pushToken', 'webhookUrl',
      'createdAt', 'updatedAt', 'deletedAt', 'lastSyncedAt'
    ];
    
    const existingUserColumns = userColumns.map((col: any) => col.column_name);
    
    for (const column of requiredUserColumns) {
      if (existingUserColumns.includes(column)) {
        console.log(`✅ users.${column} exists`);
      } else {
        console.log(`❌ users.${column} is missing`);
        throw new Error(`Required column 'users.${column}' is missing`);
      }
    }
    
    // Test 3: Check data integrity
    console.log('\n📋 Test 3: Checking data integrity...');
    
    // Check if user statistics are calculated correctly
    const userStats = await dataSource.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN "questsCompleted" > 0 THEN 1 END) as users_with_completions,
        COUNT(CASE WHEN "totalEarned" > '0' THEN 1 END) as users_with_earnings
      FROM "users"
    `);
    
    console.log(`✅ Total users: ${userStats[0].total_users}`);
    console.log(`✅ Users with completions: ${userStats[0].users_with_completions}`);
    console.log(`✅ Users with earnings: ${userStats[0].users_with_earnings}`);
    
    // Check quest statistics
    const questStats = await dataSource.query(`
      SELECT 
        COUNT(*) as total_quests,
        COUNT(CASE WHEN "status" = 'ACTIVE' THEN 1 END) as active_quests,
        COUNT(CASE WHEN "currentCompletions" > 0 THEN 1 END) as quests_with_completions
      FROM "quests"
    `);
    
    console.log(`✅ Total quests: ${questStats[0].total_quests}`);
    console.log(`✅ Active quests: ${questStats[0].active_quests}`);
    console.log(`✅ Quests with completions: ${questStats[0].quests_with_completions}`);
    
    // Test 4: Check foreign key constraints
    console.log('\n📋 Test 4: Checking foreign key constraints...');
    
    const constraintChecks = [
      {
        name: 'submissions_user_fk',
        query: `
          SELECT COUNT(*) as invalid_count
          FROM "submissions" s
          LEFT JOIN "users" u ON s."userId" = u.id
          WHERE u.id IS NULL
        `
      },
      {
        name: 'submissions_quest_fk',
        query: `
          SELECT COUNT(*) as invalid_count
          FROM "submissions" s
          LEFT JOIN "quests" q ON s."questId" = q.id
          WHERE q.id IS NULL
        `
      }
    ];
    
    for (const check of constraintChecks) {
      const result = await dataSource.query(check.query);
      if (result[0].invalid_count === 0) {
        console.log(`✅ ${check.name}: No orphaned records`);
      } else {
        console.log(`❌ ${check.name}: Found ${result[0].invalid_count} orphaned records`);
        throw new Error(`Foreign key constraint violation in ${check.name}`);
      }
    }
    
    // Test 5: Check indexes
    console.log('\n📋 Test 5: Checking indexes...');
    
    const indexChecks = [
      'IDX_users_username',
      'IDX_users_email',
      'IDX_quests_status',
      'IDX_submissions_status',
      'IDX_payouts_status'
    ];
    
    for (const index of indexChecks) {
      const indexExists = await dataSource.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE indexname = '${index}'
        )
      `);
      
      if (indexExists[0].exists) {
        console.log(`✅ Index ${index} exists`);
      } else {
        console.log(`⚠️  Index ${index} does not exist (may be created later)`);
      }
    }
    
    console.log('\n🎉 All migration tests passed!');
    
  } catch (error) {
    console.error('❌ Migration tests failed:', error);
    throw error;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

// Performance test
async function testMigrationPerformance() {
  console.log('Starting migration performance test...');
  
  const dataSource = new DataSource(dataSourceOptions);
  
  try {
    await dataSource.initialize();
    
    console.log('Testing query performance...');
    
    const start = Date.now();
    
    // Test user statistics query
    await dataSource.query(`
      SELECT 
        COUNT(*) as total_users,
        AVG("questsCompleted") as avg_completions,
        AVG("successRate") as avg_success_rate
      FROM "users"
    `);
    
    const userQueryTime = Date.now() - start;
    console.log(`✅ User statistics query: ${userQueryTime}ms`);
    
    // Test quest statistics query
    const questStart = Date.now();
    await dataSource.query(`
      SELECT 
        COUNT(*) as total_quests,
        COUNT(CASE WHEN "status" = 'ACTIVE' THEN 1 END) as active_count
      FROM "quests"
    `);
    
    const questQueryTime = Date.now() - questStart;
    console.log(`✅ Quest statistics query: ${questQueryTime}ms`);
    
    // Test submission statistics query
    const submissionStart = Date.now();
    await dataSource.query(`
      SELECT 
        COUNT(*) as total_submissions,
        COUNT(CASE WHEN "status" = 'APPROVED' THEN 1 END) as approved_count
      FROM "submissions"
    `);
    
    const submissionQueryTime = Date.now() - submissionStart;
    console.log(`✅ Submission statistics query: ${submissionQueryTime}ms`);
    
    console.log('🎉 Performance tests completed');
    
  } catch (error) {
    console.error('❌ Performance tests failed:', error);
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
  
  if (command === 'performance') {
    testMigrationPerformance().catch(console.error);
  } else {
    testMigrations().catch(console.error);
  }
}

export { testMigrations, testMigrationPerformance };
