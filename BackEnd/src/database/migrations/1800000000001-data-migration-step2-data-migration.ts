import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Step 2 of two-step migration: Data migration
 * This migration migrates and transforms existing data to match the new schema
 * and establishes proper relationships between entities
 */
export class DataMigrationStep2DataMigration1800000000001 implements MigrationInterface {
  name = 'DataMigrationStep2DataMigration1800000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Starting Step 2: Data migration...');

    // Migrate user data
    await this.migrateUserData(queryRunner);
    
    // Migrate quest data
    await this.migrateQuestData(queryRunner);
    
    // Migrate submission data
    await this.migrateSubmissionData(queryRunner);
    
    // Migrate payout data
    await this.migratePayoutData(queryRunner);
    
    // Establish relationships and constraints
    await this.establishRelationships(queryRunner);

    console.log('Step 2: Data migration completed');
  }

  private async migrateUserData(queryRunner: QueryRunner): Promise<void> {
    console.log('Migrating user data...');
    
    // Update user statistics based on existing data
    await queryRunner.query(`
      UPDATE "users" u
      SET 
        "questsCompleted" = COALESCE(
          (SELECT COUNT(*)::INTEGER 
           FROM "submissions" s 
           WHERE s."userId" = u.id AND s."status" = 'APPROVED'), 0
        ),
        "failedQuests" = COALESCE(
          (SELECT COUNT(*)::INTEGER 
           FROM "submissions" s 
           WHERE s."userId" = u.id AND s."status" = 'REJECTED'), 0
        ),
        "successRate" = CASE 
          WHEN (SELECT COUNT(*) FROM "submissions" s WHERE s."userId" = u.id) > 0 
          THEN ROUND(
            (SELECT COUNT(*)::DECIMAL 
             FROM "submissions" s 
             WHERE s."userId" = u.id AND s."status" = 'APPROVED') * 100.0 / 
            (SELECT COUNT(*)::DECIMAL FROM "submissions" s WHERE s."userId" = u.id), 2
          )
          ELSE 0
        END,
        "totalEarned" = COALESCE(
          (SELECT COALESCE(SUM(amount), 0)::BIGINT 
           FROM "payouts" p 
           WHERE p."stellarAddress" = u."stellarAddress" AND p."status" = 'completed'), '0'
        ),
        "lastActiveAt" = COALESCE(
          (SELECT MAX("updatedAt") 
           FROM "submissions" s 
           WHERE s."userId" = u.id), u."updatedAt"
        )
    `);

    // Set default privacy level for users who don't have one
    await queryRunner.query(`
      UPDATE "users" 
      SET "privacyLevel" = 'PUBLIC' 
      WHERE "privacyLevel" IS NULL
    `);

    // Initialize badges array for users
    await queryRunner.query(`
      UPDATE "users" 
      SET "badges" = ARRAY[]::TEXT[] 
      WHERE "badges" IS NULL
    `);

    // Initialize social links object for users
    await queryRunner.query(`
      UPDATE "users" 
      SET "socialLinks" = '{}'::JSONB 
      WHERE "socialLinks" IS NULL
    `);

    console.log('User data migration completed');
  }

  private async migrateQuestData(queryRunner: QueryRunner): Promise<void> {
    console.log('Migrating quest data...');
    
    // Update quest creatorAddress from user stellarAddress
    await queryRunner.query(`
      UPDATE "quests" q
      SET "creatorAddress" = u."stellarAddress"
      FROM "users" u
      WHERE q."createdBy" = u.id AND q."creatorAddress" IS NULL
    `);

    // Update current completions based on approved submissions
    await queryRunner.query(`
      UPDATE "quests" q
      SET "currentCompletions" = COALESCE(
        (SELECT COUNT(*)::INTEGER 
         FROM "submissions" s 
         WHERE s."questId" = q.id AND s."status" = 'APPROVED'), 0
      )
    `);

    // Set default start date to creation date if not set
    await queryRunner.query(`
      UPDATE "quests" 
      SET "startDate" = "createdAt" 
      WHERE "startDate" IS NULL
    `);

    console.log('Quest data migration completed');
  }

  private async migrateSubmissionData(queryRunner: QueryRunner): Promise<void> {
    console.log('Migrating submission data...');
    
    // Update submission status to use proper enum values
    await queryRunner.query(`
      UPDATE "submissions" 
      SET "status" = 'UNDER_REVIEW' 
      WHERE "status" = 'PENDING' AND "approvedBy" IS NOT NULL
    `);

    // Ensure proof field is valid JSON
    await queryRunner.query(`
      UPDATE "submissions" 
      SET "proof" = CASE 
        WHEN "proof" IS NULL THEN '{}'
        WHEN jsonb_typeof("proof") = 'object' THEN "proof"
        ELSE '{"data": ' || COALESCE("proof"::TEXT, '{}') || '}'
      END::JSONB
    `);

    console.log('Submission data migration completed');
  }

  private async migratePayoutData(queryRunner: QueryRunner): Promise<void> {
    console.log('Migrating payout data...');
    
    // Update payout status to use proper enum values
    await queryRunner.query(`
      UPDATE "payouts" 
      SET "status" = LOWER("status")
    `);

    // Link payouts to submissions where possible
    await queryRunner.query(`
      UPDATE "payouts" p
      SET "submissionId" = s.id,
          "questId" = s."questId"
      FROM "submissions" s,
           "users" u
      WHERE p."stellarAddress" = u."stellarAddress" 
        AND s."userId" = u.id 
        AND s."status" = 'APPROVED'
        AND p."submissionId" IS NULL
      LIMIT 1
    `);

    // Set default type for payouts that don't have one
    await queryRunner.query(`
      UPDATE "payouts" 
      SET "type" = 'quest_reward' 
      WHERE "type" IS NULL
    `);

    console.log('Payout data migration completed');
  }

  private async establishRelationships(queryRunner: QueryRunner): Promise<void> {
    console.log('Establishing relationships and constraints...');
    
    // Create foreign key constraints if they don't exist
    try {
      // User foreign keys
      await queryRunner.query(`
        ALTER TABLE "submissions" 
        ADD CONSTRAINT "FK_submissions_user" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      `);
    } catch (error) {
      console.log('FK_submissions_user already exists or cannot be created');
    }

    try {
      await queryRunner.query(`
        ALTER TABLE "quests" 
        ADD CONSTRAINT "FK_quests_creator" 
        FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE
      `);
    } catch (error) {
      console.log('FK_quests_creator already exists or cannot be created');
    }

    try {
      await queryRunner.query(`
        ALTER TABLE "submissions" 
        ADD CONSTRAINT "FK_submissions_quest" 
        FOREIGN KEY ("questId") REFERENCES "quests"("id") ON DELETE CASCADE
      `);
    } catch (error) {
      console.log('FK_submissions_quest already exists or cannot be created');
    }

    try {
      await queryRunner.query(`
        ALTER TABLE "notifications" 
        ADD CONSTRAINT "FK_notifications_user" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      `);
    } catch (error) {
      console.log('FK_notifications_user already exists or cannot be created');
    }

    try {
      await queryRunner.query(`
        ALTER TABLE "refresh_tokens" 
        ADD CONSTRAINT "FK_refresh_tokens_user" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      `);
    } catch (error) {
      console.log('FK_refresh_tokens_user already exists or cannot be created');
    }

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS "IDX_users_username" ON "users" ("username")',
      'CREATE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email")',
      'CREATE INDEX IF NOT EXISTS "IDX_quests_status" ON "quests" ("status")',
      'CREATE INDEX IF NOT EXISTS "IDX_quests_createdBy" ON "quests" ("createdBy")',
      'CREATE INDEX IF NOT EXISTS "IDX_submissions_status" ON "submissions" ("status")',
      'CREATE INDEX IF NOT EXISTS "IDX_submissions_userId" ON "submissions" ("userId")',
      'CREATE INDEX IF NOT EXISTS "IDX_submissions_questId" ON "submissions" ("questId")',
      'CREATE INDEX IF NOT EXISTS "IDX_payouts_status" ON "payouts" ("status")',
      'CREATE INDEX IF NOT EXISTS "IDX_payouts_stellarAddress" ON "payouts" ("stellarAddress")',
      'CREATE INDEX IF NOT EXISTS "IDX_payouts_questId" ON "payouts" ("questId")',
      'CREATE INDEX IF NOT EXISTS "IDX_payouts_submissionId" ON "payouts" ("submissionId")'
    ];

    for (const indexQuery of indexes) {
      try {
        await queryRunner.query(indexQuery);
      } catch (error) {
        console.log(`Index creation failed: ${indexQuery}`);
      }
    }

    console.log('Relationships and constraints established');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Rolling back Step 2: Data migration...');
    
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
        await queryRunner.query(`ALTER TABLE DROP CONSTRAINT IF EXISTS "${constraint}"`);
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
        await queryRunner.query(`DROP INDEX IF EXISTS "${index}"`);
      } catch (error) {
        console.log(`Index ${index} does not exist or cannot be dropped`);
      }
    }

    // Reset calculated fields to NULL or default values
    await queryRunner.query(`
      UPDATE "users" 
      SET 
        "questsCompleted" = 0,
        "failedQuests" = 0,
        "successRate" = 0,
        "totalEarned" = '0',
        "lastActiveAt" = NULL
    `);

    await queryRunner.query(`
      UPDATE "quests" 
      SET 
        "creatorAddress" = NULL,
        "currentCompletions" = 0,
        "startDate" = NULL
    `);

    await queryRunner.query(`
      UPDATE "submissions" 
      SET "proof" = '{}'::JSONB
    `);

    await queryRunner.query(`
      UPDATE "payouts" 
      SET 
        "submissionId" = NULL,
        "questId" = NULL,
        "type" = 'quest_reward'
    `);

    console.log('Step 2 rollback completed');
  }
}
