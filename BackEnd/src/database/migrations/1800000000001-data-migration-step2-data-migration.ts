import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Step 2 of two-step migration: Data migration
 * This migration migrates and transforms existing data to match the new schema
 * and establishes proper relationships between entities.
 *
 * Every individual query uses a SAVEPOINT so that a failure in one statement
 * does not abort the surrounding PostgreSQL transaction and poison all
 * subsequent statements.
 */
export class DataMigrationStep2DataMigration1800000000001 implements MigrationInterface {
  name = 'DataMigrationStep2DataMigration1800000000001';

  /**
   * Execute a single SQL statement inside a SAVEPOINT so that if it fails
   * the surrounding transaction is not aborted.
   */
  private async safeQuery(
    queryRunner: QueryRunner,
    label: string,
    sql: string,
  ): Promise<void> {
    const sp = `sp_${label.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    await queryRunner.query(`SAVEPOINT ${sp}`);
    try {
      await queryRunner.query(sql);
      await queryRunner.query(`RELEASE SAVEPOINT ${sp}`);
    } catch (err) {
      await queryRunner.query(`ROLLBACK TO SAVEPOINT ${sp}`);
      console.log(`[DataMigrationStep2] ${label} skipped: ${(err as Error).message}`);
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Starting Step 2: Data migration...');

    await this.migrateUserData(queryRunner);
    await this.migrateQuestData(queryRunner);
    await this.migrateSubmissionData(queryRunner);
    await this.migratePayoutData(queryRunner);
    await this.establishRelationships(queryRunner);

    console.log('Step 2: Data migration completed');
  }

  // ---------------------------------------------------------------------------
  // User data
  // ---------------------------------------------------------------------------
  private async migrateUserData(queryRunner: QueryRunner): Promise<void> {
    console.log('Migrating user data...');

    await this.safeQuery(queryRunner, 'user_stats', `
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

    await this.safeQuery(queryRunner, 'user_privacy', `
      UPDATE "users" 
      SET "privacyLevel" = 'PUBLIC' 
      WHERE "privacyLevel" IS NULL
    `);

    await this.safeQuery(queryRunner, 'user_badges', `
      UPDATE "users" 
      SET "badges" = ARRAY[]::TEXT[] 
      WHERE "badges" IS NULL
    `);

    await this.safeQuery(queryRunner, 'user_socialLinks', `
      UPDATE "users" 
      SET "socialLinks" = '{}'::JSONB 
      WHERE "socialLinks" IS NULL
    `);

    console.log('User data migration completed');
  }

  // ---------------------------------------------------------------------------
  // Quest data
  // ---------------------------------------------------------------------------
  private async migrateQuestData(queryRunner: QueryRunner): Promise<void> {
    console.log('Migrating quest data...');

    await this.safeQuery(queryRunner, 'quest_creatorAddress', `
      UPDATE "quests" q
      SET "creatorAddress" = u."stellarAddress"
      FROM "users" u
      WHERE (q."createdBy" = u.id::text OR q."createdBy" = u."stellarAddress") AND q."creatorAddress" IS NULL
    `);

    await this.safeQuery(queryRunner, 'quest_currentCompletions', `
      UPDATE "quests" q
      SET "currentCompletions" = COALESCE(
        (SELECT COUNT(*)::INTEGER 
         FROM "submissions" s 
         WHERE s."questId" = q.id AND s."status" = 'APPROVED'), 0
      )
    `);

    await this.safeQuery(queryRunner, 'quest_startDate', `
      UPDATE "quests" 
      SET "startDate" = "createdAt" 
      WHERE "startDate" IS NULL
    `);

    console.log('Quest data migration completed');
  }

  // ---------------------------------------------------------------------------
  // Submission data
  // ---------------------------------------------------------------------------
  private async migrateSubmissionData(queryRunner: QueryRunner): Promise<void> {
    console.log('Migrating submission data...');

    await this.safeQuery(queryRunner, 'submission_status', `
      UPDATE "submissions" 
      SET "status" = 'UNDER_REVIEW' 
      WHERE "status" = 'PENDING' AND "approvedBy" IS NOT NULL
    `);

    // proof column is JSON (not JSONB) — just fill NULLs
    await this.safeQuery(queryRunner, 'submission_proof_null', `
      UPDATE "submissions" 
      SET "proof" = '{}'::json 
      WHERE "proof" IS NULL
    `);

    console.log('Submission data migration completed');
  }

  // ---------------------------------------------------------------------------
  // Payout data
  // ---------------------------------------------------------------------------
  private async migratePayoutData(queryRunner: QueryRunner): Promise<void> {
    console.log('Migrating payout data...');

    await this.safeQuery(queryRunner, 'payout_stellarAddress', `
      UPDATE "payouts" p
      SET "stellarAddress" = u."stellarAddress"
      FROM "users" u
      WHERE p."userId" = u.id AND (p."stellarAddress" IS NULL OR p."stellarAddress" = '')
    `);

    await this.safeQuery(queryRunner, 'payout_status_lower', `
      UPDATE "payouts" 
      SET "status" = LOWER("status")
      WHERE "status" IS NOT NULL
    `);

    await this.safeQuery(queryRunner, 'payout_link_submissions', `
      UPDATE "payouts" p
      SET "submissionId" = s.id::text,
          "questId" = s."questId"::text
      FROM "submissions" s,
           "users" u
      WHERE p."stellarAddress" = u."stellarAddress" 
        AND s."userId" = u.id 
        AND s."status" = 'APPROVED'
        AND p."submissionId" IS NULL
    `);

    await this.safeQuery(queryRunner, 'payout_default_type', `
      UPDATE "payouts" 
      SET "type" = 'quest_reward' 
      WHERE "type" IS NULL
    `);

    console.log('Payout data migration completed');
  }

  // ---------------------------------------------------------------------------
  // Relationships & indexes
  // ---------------------------------------------------------------------------
  private async establishRelationships(
    queryRunner: QueryRunner,
  ): Promise<void> {
    console.log('Establishing relationships and constraints...');

    // Since the columns are now properly UUID typed in step 1, FK constraints can be established cleanly!
    const fkConstraints = [
      {
        name: 'FK_submissions_user',
        sql: `ALTER TABLE "submissions" ADD CONSTRAINT "FK_submissions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`,
      },
      {
        name: 'FK_quests_creator',
        sql: `ALTER TABLE "quests" ADD CONSTRAINT "FK_quests_creator" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE`,
      },
      {
        name: 'FK_submissions_quest',
        sql: `ALTER TABLE "submissions" ADD CONSTRAINT "FK_submissions_quest" FOREIGN KEY ("questId") REFERENCES "quests"("id") ON DELETE CASCADE`,
      },
      {
        name: 'FK_notifications_user',
        sql: `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`,
      },
      {
        name: 'FK_refresh_tokens_user',
        sql: `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`,
      },
    ];

    for (const fk of fkConstraints) {
      await this.safeQuery(queryRunner, `fk_${fk.name}`, fk.sql);
    }

    // Indexes — these use IF NOT EXISTS but may still fail if the table/column
    // was not created by a prior migration. Each is wrapped in a savepoint.
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
      'CREATE INDEX IF NOT EXISTS "IDX_payouts_submissionId" ON "payouts" ("submissionId")',
    ];

    for (let i = 0; i < indexes.length; i++) {
      await this.safeQuery(queryRunner, `idx_${i}`, indexes[i]);
    }

    console.log('Relationships and constraints established');
  }

  // ---------------------------------------------------------------------------
  // Rollback
  // ---------------------------------------------------------------------------
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Rolling back Step 2: Data migration...');

    const constraints = [
      'FK_submissions_user',
      'FK_quests_creator',
      'FK_submissions_quest',
      'FK_notifications_user',
      'FK_refresh_tokens_user',
    ];

    for (const constraint of constraints) {
      await this.safeQuery(queryRunner, `drop_${constraint}`,
        `ALTER TABLE DROP CONSTRAINT IF EXISTS "${constraint}"`,
      );
    }

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
      'IDX_payouts_submissionId',
    ];

    for (const index of indexes) {
      await this.safeQuery(queryRunner, `drop_${index}`,
        `DROP INDEX IF EXISTS "${index}"`,
      );
    }

    await this.safeQuery(queryRunner, 'rollback_users', `
      UPDATE "users" 
      SET 
        "questsCompleted" = 0,
        "failedQuests" = 0,
        "successRate" = 0,
        "totalEarned" = '0',
        "lastActiveAt" = NULL
    `);

    await this.safeQuery(queryRunner, 'rollback_quests', `
      UPDATE "quests" 
      SET 
        "creatorAddress" = NULL,
        "currentCompletions" = 0,
        "startDate" = NULL
    `);

    await this.safeQuery(queryRunner, 'rollback_submissions', `
      UPDATE "submissions" 
      SET "proof" = '{}'::json
    `);

    await this.safeQuery(queryRunner, 'rollback_payouts', `
      UPDATE "payouts" 
      SET 
        "submissionId" = NULL,
        "questId" = NULL,
        "type" = 'quest_reward'
    `);
  }
}
