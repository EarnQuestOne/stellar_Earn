import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Step 1 of two-step migration: Schema synchronization
 * This migration aligns the database schema with current entity definitions
 * and prepares for data migration in step 2
 */
export class DataMigrationStep1SchemaSync1800000000000 implements MigrationInterface {
  name = 'DataMigrationStep1SchemaSync1800000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Starting Step 1: Schema synchronization...');

    // Check if tables exist with old names and rename them to match entity names
    const userTableExists = await queryRunner.hasTable('User');
    const questTableExists = await queryRunner.hasTable('Quest');
    const submissionTableExists = await queryRunner.hasTable('Submission');
    const notificationTableExists = await queryRunner.hasTable('Notification');
    const payoutTableExists = await queryRunner.hasTable('Payout');
    const refreshTokenTableExists = await queryRunner.hasTable('RefreshToken');

    // Rename tables to match entity names (lowercase)
    if (userTableExists && !await queryRunner.hasTable('users')) {
      await queryRunner.query(`ALTER TABLE "User" RENAME TO "users"`);
      console.log('Renamed User table to users');
    }

    if (questTableExists && !await queryRunner.hasTable('quests')) {
      await queryRunner.query(`ALTER TABLE "Quest" RENAME TO "quests"`);
      console.log('Renamed Quest table to quests');
    }

    if (submissionTableExists && !await queryRunner.hasTable('submissions')) {
      await queryRunner.query(`ALTER TABLE "Submission" RENAME TO "submissions"`);
      console.log('Renamed Submission table to submissions');
    }

    if (notificationTableExists && !await queryRunner.hasTable('notifications')) {
      await queryRunner.query(`ALTER TABLE "Notification" RENAME TO "notifications"`);
      console.log('Renamed Notification table to notifications');
    }

    if (payoutTableExists && !await queryRunner.hasTable('payouts')) {
      await queryRunner.query(`ALTER TABLE "Payout" RENAME TO "payouts"`);
      console.log('Renamed Payout table to payouts');
    }

    if (refreshTokenTableExists && !await queryRunner.hasTable('refresh_tokens')) {
      await queryRunner.query(`ALTER TABLE "RefreshToken" RENAME TO "refresh_tokens"`);
      console.log('Renamed RefreshToken table to refresh_tokens');
    }

    // Add missing columns to users table
    if (await queryRunner.hasTable('users')) {
      const userColumns = await queryRunner.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users'
      `);
      const existingColumns = userColumns.map((col: any) => col.column_name);

      // Add missing user columns
      const missingUserColumns = [
        'questsCompleted', 'badges', 'avatarUrl', 'bio', 'socialLinks', 
        'privacyLevel', 'failedQuests', 'successRate', 'totalEarned', 
        'lastActiveAt', 'pushToken', 'webhookUrl', 'lastSyncedAt'
      ];

      for (const column of missingUserColumns) {
        if (!existingColumns.includes(column)) {
          switch (column) {
            case 'questsCompleted':
              await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "questsCompleted" INTEGER DEFAULT 0`);
              break;
            case 'badges':
              await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "badges" TEXT[]`);
              break;
            case 'avatarUrl':
              await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "avatarUrl" VARCHAR`);
              break;
            case 'bio':
              await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "bio" TEXT`);
              break;
            case 'socialLinks':
              await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "socialLinks" JSONB`);
              break;
            case 'privacyLevel':
              await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "privacyLevel" VARCHAR DEFAULT 'PUBLIC'`);
              break;
            case 'failedQuests':
              await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "failedQuests" INTEGER DEFAULT 0`);
              break;
            case 'successRate':
              await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "successRate" DECIMAL(5,2) DEFAULT 0`);
              break;
            case 'totalEarned':
              await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "totalEarned" BIGINT DEFAULT '0'`);
              break;
            case 'lastActiveAt':
              await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "lastActiveAt" TIMESTAMP`);
              break;
            case 'pushToken':
              await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "pushToken" VARCHAR`);
              break;
            case 'webhookUrl':
              await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "webhookUrl" VARCHAR`);
              break;
            case 'lastSyncedAt':
              await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "lastSyncedAt" TIMESTAMP`);
              break;
          }
          console.log(`Added column ${column} to users table`);
        }
      }
    }

    // Add missing columns to quests table
    if (await queryRunner.hasTable('quests')) {
      const questColumns = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'quests'
      `);
      const existingColumns = questColumns.map((col: any) => col.column_name);

      const missingQuestColumns = [
        'creatorAddress', 'currentCompletions', 'maxCompletions', 'startDate', 'endDate'
      ];

      for (const column of missingQuestColumns) {
        if (!existingColumns.includes(column)) {
          switch (column) {
            case 'creatorAddress':
              await queryRunner.query(`ALTER TABLE "quests" ADD COLUMN "creatorAddress" VARCHAR`);
              break;
            case 'currentCompletions':
              await queryRunner.query(`ALTER TABLE "quests" ADD COLUMN "currentCompletions" INTEGER DEFAULT 0`);
              break;
            case 'maxCompletions':
              await queryRunner.query(`ALTER TABLE "quests" ADD COLUMN "maxCompletions" INTEGER`);
              break;
            case 'startDate':
              await queryRunner.query(`ALTER TABLE "quests" ADD COLUMN "startDate" TIMESTAMP`);
              break;
            case 'endDate':
              await queryRunner.query(`ALTER TABLE "quests" ADD COLUMN "endDate" TIMESTAMP`);
              break;
          }
          console.log(`Added column ${column} to quests table`);
        }
      }
    }

    // Add missing columns to payouts table
    if (await queryRunner.hasTable('payouts')) {
      const payoutColumns = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'payouts'
      `);
      const existingColumns = payoutColumns.map((col: any) => col.column_name);

      const missingPayoutColumns = [
        'type', 'questId', 'submissionId', 'transactionHash', 'stellarLedger',
        'failureReason', 'retryCount', 'maxRetries', 'nextRetryAt', 'processedAt', 'claimedAt'
      ];

      for (const column of missingPayoutColumns) {
        if (!existingColumns.includes(column)) {
          switch (column) {
            case 'type':
              await queryRunner.query(`ALTER TABLE "payouts" ADD COLUMN "type" VARCHAR DEFAULT 'quest_reward'`);
              break;
            case 'questId':
              await queryRunner.query(`ALTER TABLE "payouts" ADD COLUMN "questId" VARCHAR`);
              break;
            case 'submissionId':
              await queryRunner.query(`ALTER TABLE "payouts" ADD COLUMN "submissionId" VARCHAR`);
              break;
            case 'transactionHash':
              await queryRunner.query(`ALTER TABLE "payouts" ADD COLUMN "transactionHash" TEXT`);
              break;
            case 'stellarLedger':
              await queryRunner.query(`ALTER TABLE "payouts" ADD COLUMN "stellarLedger" INTEGER`);
              break;
            case 'failureReason':
              await queryRunner.query(`ALTER TABLE "payouts" ADD COLUMN "failureReason" TEXT`);
              break;
            case 'retryCount':
              await queryRunner.query(`ALTER TABLE "payouts" ADD COLUMN "retryCount" INTEGER DEFAULT 0`);
              break;
            case 'maxRetries':
              await queryRunner.query(`ALTER TABLE "payouts" ADD COLUMN "maxRetries" INTEGER DEFAULT 3`);
              break;
            case 'nextRetryAt':
              await queryRunner.query(`ALTER TABLE "payouts" ADD COLUMN "nextRetryAt" TIMESTAMP`);
              break;
            case 'processedAt':
              await queryRunner.query(`ALTER TABLE "payouts" ADD COLUMN "processedAt" TIMESTAMP`);
              break;
            case 'claimedAt':
              await queryRunner.query(`ALTER TABLE "payouts" ADD COLUMN "claimedAt" TIMESTAMP`);
              break;
          }
          console.log(`Added column ${column} to payouts table`);
        }
      }

      // Update amount column type to decimal(18,7) if it's still integer
      const amountColumn = payoutColumns.find((col: any) => col.column_name === 'amount');
      if (amountColumn && amountColumn.data_type === 'integer') {
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "amount" TYPE DECIMAL(18,7)`);
        console.log('Updated payouts.amount column to DECIMAL(18,7)');
      }
    }

    console.log('Step 1: Schema synchronization completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Rolling back Step 1: Schema synchronization...');

    // Reverse table renames
    if (await queryRunner.hasTable('users') && !await queryRunner.hasTable('User')) {
      await queryRunner.query(`ALTER TABLE "users" RENAME TO "User"`);
    }

    if (await queryRunner.hasTable('quests') && !await queryRunner.hasTable('Quest')) {
      await queryRunner.query(`ALTER TABLE "quests" RENAME TO "Quest"`);
    }

    if (await queryRunner.hasTable('submissions') && !await queryRunner.hasTable('Submission')) {
      await queryRunner.query(`ALTER TABLE "submissions" RENAME TO "Submission"`);
    }

    if (await queryRunner.hasTable('notifications') && !await queryRunner.hasTable('Notification')) {
      await queryRunner.query(`ALTER TABLE "notifications" RENAME TO "Notification"`);
    }

    if (await queryRunner.hasTable('payouts') && !await queryRunner.hasTable('Payout')) {
      await queryRunner.query(`ALTER TABLE "payouts" RENAME TO "Payout"`);
    }

    if (await queryRunner.hasTable('refresh_tokens') && !await queryRunner.hasTable('RefreshToken')) {
      await queryRunner.query(`ALTER TABLE "refresh_tokens" RENAME TO "RefreshToken"`);
    }

    // Drop added columns (optional - usually better to keep them)
    // This would be complex to implement safely, so we'll keep the columns

    console.log('Step 1 rollback completed');
  }
}
