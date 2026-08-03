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
    if (userTableExists && !(await queryRunner.hasTable('users'))) {
      await queryRunner.query(`ALTER TABLE "User" RENAME TO "users"`);
      console.log('Renamed User table to users');
    }

    if (questTableExists && !(await queryRunner.hasTable('quests'))) {
      await queryRunner.query(`ALTER TABLE "Quest" RENAME TO "quests"`);
      console.log('Renamed Quest table to quests');
    }

    if (submissionTableExists && !(await queryRunner.hasTable('submissions'))) {
      await queryRunner.query(
        `ALTER TABLE "Submission" RENAME TO "submissions"`,
      );
      console.log('Renamed Submission table to submissions');
    }

    if (
      notificationTableExists &&
      !(await queryRunner.hasTable('notifications'))
    ) {
      await queryRunner.query(
        `ALTER TABLE "Notification" RENAME TO "notifications"`,
      );
      console.log('Renamed Notification table to notifications');
    }

    if (payoutTableExists && !(await queryRunner.hasTable('payouts'))) {
      await queryRunner.query(`ALTER TABLE "Payout" RENAME TO "payouts"`);
      console.log('Renamed Payout table to payouts');
    }

    if (
      refreshTokenTableExists &&
      !(await queryRunner.hasTable('refresh_tokens'))
    ) {
      await queryRunner.query(
        `ALTER TABLE "RefreshToken" RENAME TO "refresh_tokens"`,
      );
      console.log('Renamed RefreshToken table to refresh_tokens');
    }

    // Alter existing TEXT columns that store UUIDs to UUID type to prevent joins from failing
    if (await queryRunner.hasTable('submissions')) {
      const cols = await queryRunner.query(`
        SELECT column_name, data_type FROM information_schema.columns 
        WHERE table_name = 'submissions' AND column_name IN ('userId', 'questId')
      `);
      for (const col of cols) {
        if (col.data_type === 'text') {
          await queryRunner.query(`ALTER TABLE "submissions" ALTER COLUMN "${col.column_name}" TYPE UUID USING "${col.column_name}"::uuid`);
          console.log(`Altered submissions.${col.column_name} to UUID`);
        }
      }
    }

    if (await queryRunner.hasTable('notifications')) {
      const col = await queryRunner.query(`
        SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'userId'
      `);
      if (col.length && col[0].data_type === 'text') {
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid`);
        console.log('Altered notifications.userId to UUID');
      }
    }

    if (await queryRunner.hasTable('payouts')) {
      const col = await queryRunner.query(`
        SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'payouts' AND column_name = 'userId'
      `);
      if (col.length && col[0].data_type === 'text') {
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid`);
        console.log('Altered payouts.userId to UUID');
      }
    }

    if (await queryRunner.hasTable('refresh_tokens')) {
      const col = await queryRunner.query(`
        SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'refresh_tokens' AND column_name = 'userId'
      `);
      if (col.length && col[0].data_type === 'text') {
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid`);
        console.log('Altered refresh_tokens.userId to UUID');
      }
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
        'questsCompleted',
        'badges',
        'avatarUrl',
        'bio',
        'socialLinks',
        'privacyLevel',
        'failedQuests',
        'successRate',
        'totalEarned',
        'lastActiveAt',
        'pushToken',
        'webhookUrl',
        'lastSyncedAt',
        'totalXp',
      ];

      for (const column of missingUserColumns) {
        if (!existingColumns.includes(column)) {
          switch (column) {
            case 'questsCompleted':
              await queryRunner.query(
                `ALTER TABLE "users" ADD COLUMN "questsCompleted" INTEGER DEFAULT 0`,
              );
              break;
            case 'badges':
              await queryRunner.query(
                `ALTER TABLE "users" ADD COLUMN "badges" TEXT[]`,
              );
              break;
            case 'avatarUrl':
              await queryRunner.query(
                `ALTER TABLE "users" ADD COLUMN "avatarUrl" VARCHAR`,
              );
              break;
            case 'bio':
              await queryRunner.query(
                `ALTER TABLE "users" ADD COLUMN "bio" TEXT`,
              );
              break;
            case 'socialLinks':
              await queryRunner.query(
                `ALTER TABLE "users" ADD COLUMN "socialLinks" JSONB`,
              );
              break;
            case 'privacyLevel':
              await queryRunner.query(
                `ALTER TABLE "users" ADD COLUMN "privacyLevel" VARCHAR DEFAULT 'PUBLIC'`,
              );
              break;
            case 'failedQuests':
              await queryRunner.query(
                `ALTER TABLE "users" ADD COLUMN "failedQuests" INTEGER DEFAULT 0`,
              );
              break;
            case 'successRate':
              await queryRunner.query(
                `ALTER TABLE "users" ADD COLUMN "successRate" DECIMAL(5,2) DEFAULT 0`,
              );
              break;
            case 'totalEarned':
              await queryRunner.query(
                `ALTER TABLE "users" ADD COLUMN "totalEarned" BIGINT DEFAULT '0'`,
              );
              break;
            case 'lastActiveAt':
              await queryRunner.query(
                `ALTER TABLE "users" ADD COLUMN "lastActiveAt" TIMESTAMP`,
              );
              break;
            case 'pushToken':
              await queryRunner.query(
                `ALTER TABLE "users" ADD COLUMN "pushToken" VARCHAR`,
              );
              break;
            case 'webhookUrl':
              await queryRunner.query(
                `ALTER TABLE "users" ADD COLUMN "webhookUrl" VARCHAR`,
              );
              break;
            case 'lastSyncedAt':
              await queryRunner.query(
                `ALTER TABLE "users" ADD COLUMN "lastSyncedAt" TIMESTAMP`,
              );
              break;
            case 'totalXp':
              await queryRunner.query(
                `ALTER TABLE "users" ADD COLUMN "totalXp" INTEGER DEFAULT 0`,
              );
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
        'creatorAddress',
        'currentCompletions',
        'maxCompletions',
        'startDate',
        'endDate',
        'difficulty',
      ];

      for (const column of missingQuestColumns) {
        if (!existingColumns.includes(column)) {
          switch (column) {
            case 'creatorAddress':
              await queryRunner.query(
                `ALTER TABLE "quests" ADD COLUMN "creatorAddress" VARCHAR`,
              );
              break;
            case 'currentCompletions':
              await queryRunner.query(
                `ALTER TABLE "quests" ADD COLUMN "currentCompletions" INTEGER DEFAULT 0`,
              );
              break;
            case 'maxCompletions':
              await queryRunner.query(
                `ALTER TABLE "quests" ADD COLUMN "maxCompletions" INTEGER`,
              );
              break;
            case 'startDate':
              await queryRunner.query(
                `ALTER TABLE "quests" ADD COLUMN "startDate" TIMESTAMP`,
              );
              break;
            case 'endDate':
              await queryRunner.query(
                `ALTER TABLE "quests" ADD COLUMN "endDate" TIMESTAMP`,
              );
              break;
            case 'difficulty':
              await queryRunner.query(
                `ALTER TABLE "quests" ADD COLUMN "difficulty" VARCHAR`,
              );
              break;
          }
          console.log(`Added column ${column} to quests table`);
        }
      }
    }

    // Add missing columns to submissions table
    if (await queryRunner.hasTable('submissions')) {
      const submissionColumns = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'submissions'
      `);
      const existingColumns = submissionColumns.map((col: any) => col.column_name);

      const missingSubmissionColumns = [
        'approvedBy',
        'approvedAt',
        'rejectedBy',
        'rejectedAt',
        'rejectionReason',
        'verifierNotes',
        'transactionHash',
      ];

      for (const column of missingSubmissionColumns) {
        if (!existingColumns.includes(column)) {
          switch (column) {
            case 'approvedBy':
              await queryRunner.query(
                `ALTER TABLE "submissions" ADD COLUMN "approvedBy" VARCHAR`,
              );
              break;
            case 'approvedAt':
              await queryRunner.query(
                `ALTER TABLE "submissions" ADD COLUMN "approvedAt" TIMESTAMP`,
              );
              break;
            case 'rejectedBy':
              await queryRunner.query(
                `ALTER TABLE "submissions" ADD COLUMN "rejectedBy" VARCHAR`,
              );
              break;
            case 'rejectedAt':
              await queryRunner.query(
                `ALTER TABLE "submissions" ADD COLUMN "rejectedAt" TIMESTAMP`,
              );
              break;
            case 'rejectionReason':
              await queryRunner.query(
                `ALTER TABLE "submissions" ADD COLUMN "rejectionReason" TEXT`,
              );
              break;
            case 'verifierNotes':
              await queryRunner.query(
                `ALTER TABLE "submissions" ADD COLUMN "verifierNotes" TEXT`,
              );
              break;
            case 'transactionHash':
              await queryRunner.query(
                `ALTER TABLE "submissions" ADD COLUMN "transactionHash" VARCHAR(128)`,
              );
              break;
          }
          console.log(`Added column ${column} to submissions table`);
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

      // Make userId nullable on payouts since Payout entity uses stellarAddress instead of userId
      const userIdCol = payoutColumns.find((col: any) => col.column_name === 'userId');
      if (userIdCol) {
        await queryRunner.query(`ALTER TABLE "payouts" ALTER COLUMN "userId" DROP NOT NULL`);
      }

      const missingPayoutColumns = [
        'stellarAddress',
        'type',
        'questId',
        'submissionId',
        'transactionHash',
        'stellarLedger',
        'failureReason',
        'retryCount',
        'maxRetries',
        'nextRetryAt',
        'processedAt',
        'claimedAt',
      ];

      for (const column of missingPayoutColumns) {
        if (!existingColumns.includes(column)) {
          switch (column) {
            case 'stellarAddress':
              await queryRunner.query(
                `ALTER TABLE "payouts" ADD COLUMN "stellarAddress" VARCHAR`,
              );
              break;
            case 'type':
              await queryRunner.query(
                `ALTER TABLE "payouts" ADD COLUMN "type" VARCHAR DEFAULT 'quest_reward'`,
              );
              break;
            case 'questId':
              await queryRunner.query(
                `ALTER TABLE "payouts" ADD COLUMN "questId" VARCHAR`,
              );
              break;
            case 'submissionId':
              await queryRunner.query(
                `ALTER TABLE "payouts" ADD COLUMN "submissionId" VARCHAR`,
              );
              break;
            case 'transactionHash':
              await queryRunner.query(
                `ALTER TABLE "payouts" ADD COLUMN "transactionHash" TEXT`,
              );
              break;
            case 'stellarLedger':
              await queryRunner.query(
                `ALTER TABLE "payouts" ADD COLUMN "stellarLedger" INTEGER`,
              );
              break;
            case 'failureReason':
              await queryRunner.query(
                `ALTER TABLE "payouts" ADD COLUMN "failureReason" TEXT`,
              );
              break;
            case 'retryCount':
              await queryRunner.query(
                `ALTER TABLE "payouts" ADD COLUMN "retryCount" INTEGER DEFAULT 0`,
              );
              break;
            case 'maxRetries':
              await queryRunner.query(
                `ALTER TABLE "payouts" ADD COLUMN "maxRetries" INTEGER DEFAULT 3`,
              );
              break;
            case 'nextRetryAt':
              await queryRunner.query(
                `ALTER TABLE "payouts" ADD COLUMN "nextRetryAt" TIMESTAMP`,
              );
              break;
            case 'processedAt':
              await queryRunner.query(
                `ALTER TABLE "payouts" ADD COLUMN "processedAt" TIMESTAMP`,
              );
              break;
            case 'claimedAt':
              await queryRunner.query(
                `ALTER TABLE "payouts" ADD COLUMN "claimedAt" TIMESTAMP`,
              );
              break;
          }
          console.log(`Added column ${column} to payouts table`);
        }
      }

      // Update amount column type to decimal(18,7) if it's still integer
      const amountColumn = payoutColumns.find(
        (col: any) => col.column_name === 'amount',
      );
      if (amountColumn && amountColumn.data_type === 'integer') {
        await queryRunner.query(
          `ALTER TABLE "payouts" ALTER COLUMN "amount" TYPE DECIMAL(18,7)`,
        );
        console.log('Updated payouts.amount column to DECIMAL(18,7)');
      }
    }

    // Add missing columns to notifications table
    if (await queryRunner.hasTable('notifications')) {
      const notificationColumns = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'notifications'
      `);
      const existingColumns = notificationColumns.map((col: any) => col.column_name);
      if (!existingColumns.includes('priority')) {
        await queryRunner.query(
          `ALTER TABLE "notifications" ADD COLUMN "priority" VARCHAR DEFAULT 'NORMAL'`,
        );
        console.log('Added column priority to notifications table');
      }
    }

    // Ensure quota_configs table exists
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quota_configs" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "tenantId" VARCHAR NOT NULL,
        "maxQuestsPerPeriod" INTEGER DEFAULT 100,
        "maxPayoutAmountPerPeriod" DECIMAL(18,7) DEFAULT 10000,
        "maxSinglePayoutAmount" DECIMAL(18,7) DEFAULT 1000,
        "periodSeconds" INTEGER NOT NULL DEFAULT 86400,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quota_configs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_quota_configs_tenantId" UNIQUE ("tenantId")
      )
    `);

    // Ensure quota_usages table exists
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quota_usages" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "tenantId" VARCHAR NOT NULL,
        "resourceType" VARCHAR NOT NULL,
        "periodStart" TIMESTAMP NOT NULL,
        "questCount" INTEGER NOT NULL DEFAULT 0,
        "payoutAmount" DECIMAL(18,7) NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quota_usages" PRIMARY KEY ("id")
      )
    `);

    console.log('Step 1: Schema synchronization completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Rolling back Step 1: Schema synchronization...');

    // Reverse table renames
    if (
      (await queryRunner.hasTable('users')) &&
      !(await queryRunner.hasTable('User'))
    ) {
      await queryRunner.query(`ALTER TABLE "users" RENAME TO "User"`);
    }

    if (
      (await queryRunner.hasTable('quests')) &&
      !(await queryRunner.hasTable('Quest'))
    ) {
      await queryRunner.query(`ALTER TABLE "quests" RENAME TO "Quest"`);
    }

    if (
      (await queryRunner.hasTable('submissions')) &&
      !(await queryRunner.hasTable('Submission'))
    ) {
      await queryRunner.query(
        `ALTER TABLE "submissions" RENAME TO "Submission"`,
      );
    }

    if (
      (await queryRunner.hasTable('notifications')) &&
      !(await queryRunner.hasTable('Notification'))
    ) {
      await queryRunner.query(
        `ALTER TABLE "notifications" RENAME TO "Notification"`,
      );
    }

    if (
      (await queryRunner.hasTable('payouts')) &&
      !(await queryRunner.hasTable('Payout'))
    ) {
      await queryRunner.query(`ALTER TABLE "payouts" RENAME TO "Payout"`);
    }

    if (
      (await queryRunner.hasTable('refresh_tokens')) &&
      !(await queryRunner.hasTable('RefreshToken'))
    ) {
      await queryRunner.query(
        `ALTER TABLE "refresh_tokens" RENAME TO "RefreshToken"`,
      );
    }

    // Drop added columns (optional - usually better to keep them)
    // This would be complex to implement safely, so we'll keep the columns

    console.log('Step 1 rollback completed');
  }
}
