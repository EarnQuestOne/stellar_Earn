import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add Performance Indexes
 *
 * This migration adds critical indexes to improve query performance across the application.
 *
 * See DATABASE_INDEX_ANALYSIS.md for detailed analysis
 */
export class AddPerformanceIndexes1800000000007 implements MigrationInterface {
  name = 'AddPerformanceIndexes1800000000007';

  private async hasColumn(queryRunner: QueryRunner, table: string, column: string): Promise<boolean> {
    const res = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [table, column],
    );
    return res.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // USER TABLE INDEXES
    // ============================================

    if (await this.hasColumn(queryRunner, 'users', 'email')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_USER_EMAIL" ON "users" ("email") WHERE "email" IS NOT NULL`,
      );
    }

    if (await this.hasColumn(queryRunner, 'users', 'username')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_USER_USERNAME" ON "users" ("username") WHERE "username" IS NOT NULL`,
      );
    }

    if (await this.hasColumn(queryRunner, 'users', 'googleId')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_USER_GOOGLE_ID" ON "users" ("googleId") WHERE "googleId" IS NOT NULL`,
      );
    }

    if (await this.hasColumn(queryRunner, 'users', 'githubId')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_USER_GITHUB_ID" ON "users" ("githubId") WHERE "githubId" IS NOT NULL`,
      );
    }

    if (await this.hasColumn(queryRunner, 'users', 'lastActiveAt')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_USER_LAST_ACTIVE_AT" ON "users" ("lastActiveAt") WHERE "lastActiveAt" IS NOT NULL`,
      );
    }

    if (await this.hasColumn(queryRunner, 'users', 'createdAt')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_USER_CREATED_AT" ON "users" ("createdAt")`,
      );
    }

    if (
      (await this.hasColumn(queryRunner, 'users', 'role')) &&
      (await this.hasColumn(queryRunner, 'users', 'deletedAt'))
    ) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_USER_ROLE_DELETED" ON "users" ("role", "deletedAt")`,
      );
    }

    // ============================================
    // QUEST TABLE INDEXES
    // ============================================

    if (await this.hasColumn(queryRunner, 'quests', 'status')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_QUEST_STATUS" ON "quests" ("status")`,
      );
    }

    if (await this.hasColumn(queryRunner, 'quests', 'createdBy')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_QUEST_CREATED_BY" ON "quests" ("createdBy")`,
      );
    }

    if (await this.hasColumn(queryRunner, 'quests', 'createdAt')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_QUEST_CREATED_AT" ON "quests" ("createdAt")`,
      );
    }

    if (await this.hasColumn(queryRunner, 'quests', 'deadline')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_QUEST_DEADLINE" ON "quests" ("deadline") WHERE "deadline" IS NOT NULL`,
      );
    }

    if (await this.hasColumn(queryRunner, 'quests', 'contractTaskId')) {
      await queryRunner.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_QUEST_CONTRACT_TASK_ID" ON "quests" ("contractTaskId")`,
      );
    }

    if (
      (await this.hasColumn(queryRunner, 'quests', 'status')) &&
      (await this.hasColumn(queryRunner, 'quests', 'deadline'))
    ) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_QUEST_STATUS_DEADLINE" ON "quests" ("status", "deadline") WHERE "deadline" IS NOT NULL`,
      );
    }

    if (
      (await this.hasColumn(queryRunner, 'quests', 'createdBy')) &&
      (await this.hasColumn(queryRunner, 'quests', 'status'))
    ) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_QUEST_CREATOR_STATUS" ON "quests" ("createdBy", "status")`,
      );
    }

    if (await this.hasColumn(queryRunner, 'quests', 'deletedAt')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_QUEST_DELETED_AT" ON "quests" ("deletedAt")`,
      );
    }

    // ============================================
    // PAYOUT TABLE INDEXES
    // ============================================

    if (await this.hasColumn(queryRunner, 'payouts', 'stellarAddress')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_PAYOUT_STELLAR_ADDRESS" ON "payouts" ("stellarAddress")`,
      );
    }

    if (await this.hasColumn(queryRunner, 'payouts', 'status')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_PAYOUT_STATUS" ON "payouts" ("status")`,
      );
    }

    if (await this.hasColumn(queryRunner, 'payouts', 'type')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_PAYOUT_TYPE" ON "payouts" ("type")`,
      );
    }

    if (await this.hasColumn(queryRunner, 'payouts', 'questId')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_PAYOUT_QUEST_ID" ON "payouts" ("questId") WHERE "questId" IS NOT NULL`,
      );
    }

    if (await this.hasColumn(queryRunner, 'payouts', 'submissionId')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_PAYOUT_SUBMISSION_ID" ON "payouts" ("submissionId") WHERE "submissionId" IS NOT NULL`,
      );
    }

    if (await this.hasColumn(queryRunner, 'payouts', 'transactionHash')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_PAYOUT_TRANSACTION_HASH" ON "payouts" ("transactionHash") WHERE "transactionHash" IS NOT NULL`,
      );
    }

    if (await this.hasColumn(queryRunner, 'payouts', 'nextRetryAt')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_PAYOUT_NEXT_RETRY_AT" ON "payouts" ("nextRetryAt") WHERE "nextRetryAt" IS NOT NULL`,
      );
    }

    if (await this.hasColumn(queryRunner, 'payouts', 'createdAt')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_PAYOUT_CREATED_AT" ON "payouts" ("createdAt")`,
      );
    }

    if (await this.hasColumn(queryRunner, 'payouts', 'processedAt')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_PAYOUT_PROCESSED_AT" ON "payouts" ("processedAt") WHERE "processedAt" IS NOT NULL`,
      );
    }

    if (
      (await this.hasColumn(queryRunner, 'payouts', 'stellarAddress')) &&
      (await this.hasColumn(queryRunner, 'payouts', 'status'))
    ) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_PAYOUT_ADDRESS_STATUS" ON "payouts" ("stellarAddress", "status")`,
      );
    }

    if (
      (await this.hasColumn(queryRunner, 'payouts', 'status')) &&
      (await this.hasColumn(queryRunner, 'payouts', 'nextRetryAt'))
    ) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_PAYOUT_STATUS_RETRY" ON "payouts" ("status", "nextRetryAt") WHERE "nextRetryAt" IS NOT NULL`,
      );
    }

    if (
      (await this.hasColumn(queryRunner, 'payouts', 'questId')) &&
      (await this.hasColumn(queryRunner, 'payouts', 'status'))
    ) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_PAYOUT_QUEST_STATUS" ON "payouts" ("questId", "status") WHERE "questId" IS NOT NULL`,
      );
    }

    // ============================================
    // NOTIFICATION TABLE INDEXES
    // ============================================

    if (await this.hasColumn(queryRunner, 'notifications', 'createdAt')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_NOTIFICATION_CREATED_AT" ON "notifications" ("createdAt")`,
      );
    }

    if (await this.hasColumn(queryRunner, 'notifications', 'type')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_NOTIFICATION_TYPE" ON "notifications" ("type")`,
      );
    }

    if (await this.hasColumn(queryRunner, 'notifications', 'priority')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_NOTIFICATION_PRIORITY" ON "notifications" ("priority")`,
      );
    }

    if (
      (await this.hasColumn(queryRunner, 'notifications', 'userId')) &&
      (await this.hasColumn(queryRunner, 'notifications', 'read')) &&
      (await this.hasColumn(queryRunner, 'notifications', 'createdAt'))
    ) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_NOTIFICATION_USER_READ_CREATED" ON "notifications" ("userId", "read", "createdAt")`,
      );
    }

    if (
      (await this.hasColumn(queryRunner, 'notifications', 'userId')) &&
      (await this.hasColumn(queryRunner, 'notifications', 'type'))
    ) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_NOTIFICATION_USER_TYPE" ON "notifications" ("userId", "type")`,
      );
    }

    // ============================================
    // SUBMISSION TABLE INDEXES
    // ============================================

    if (await this.hasColumn(queryRunner, 'submissions', 'createdAt')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_SUBMISSION_CREATED_AT" ON "submissions" ("createdAt")`,
      );
    }

    if (await this.hasColumn(queryRunner, 'submissions', 'approvedAt')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_SUBMISSION_APPROVED_AT" ON "submissions" ("approvedAt") WHERE "approvedAt" IS NOT NULL`,
      );
    }

    if (await this.hasColumn(queryRunner, 'submissions', 'rejectedAt')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_SUBMISSION_REJECTED_AT" ON "submissions" ("rejectedAt") WHERE "rejectedAt" IS NOT NULL`,
      );
    }

    if (
      (await this.hasColumn(queryRunner, 'submissions', 'userId')) &&
      (await this.hasColumn(queryRunner, 'submissions', 'status')) &&
      (await this.hasColumn(queryRunner, 'submissions', 'createdAt'))
    ) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_SUBMISSION_USER_STATUS_CREATED" ON "submissions" ("userId", "status", "createdAt")`,
      );
    }

    if (
      (await this.hasColumn(queryRunner, 'submissions', 'questId')) &&
      (await this.hasColumn(queryRunner, 'submissions', 'status')) &&
      (await this.hasColumn(queryRunner, 'submissions', 'createdAt'))
    ) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_SUBMISSION_QUEST_STATUS_CREATED" ON "submissions" ("questId", "status", "createdAt")`,
      );
    }

    if (
      (await this.hasColumn(queryRunner, 'submissions', 'status')) &&
      (await this.hasColumn(queryRunner, 'submissions', 'createdAt'))
    ) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_SUBMISSION_STATUS_CREATED" ON "submissions" ("status", "createdAt")`,
      );
    }

    // ============================================
    // REFRESH TOKEN TABLE INDEXES
    // ============================================

    if (await this.hasColumn(queryRunner, 'refresh_tokens', 'familyId')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_REFRESH_TOKEN_FAMILY_ID" ON "refresh_tokens" ("familyId")`,
      );
    }

    if (await this.hasColumn(queryRunner, 'refresh_tokens', 'isRevoked')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_REFRESH_TOKEN_IS_REVOKED" ON "refresh_tokens" ("isRevoked")`,
      );
    }

    if (await this.hasColumn(queryRunner, 'refresh_tokens', 'expiresAt')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_REFRESH_TOKEN_EXPIRES_AT" ON "refresh_tokens" ("expiresAt")`,
      );
    }

    if (
      (await this.hasColumn(queryRunner, 'refresh_tokens', 'userId')) &&
      (await this.hasColumn(queryRunner, 'refresh_tokens', 'isRevoked')) &&
      (await this.hasColumn(queryRunner, 'refresh_tokens', 'expiresAt'))
    ) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_REFRESH_TOKEN_USER_REVOKED_EXPIRES" ON "refresh_tokens" ("userId", "isRevoked", "expiresAt") WHERE "userId" IS NOT NULL`,
      );
    }

    if (
      (await this.hasColumn(queryRunner, 'refresh_tokens', 'familyId')) &&
      (await this.hasColumn(queryRunner, 'refresh_tokens', 'isRevoked'))
    ) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_REFRESH_TOKEN_FAMILY_REVOKED" ON "refresh_tokens" ("familyId", "isRevoked")`,
      );
    }

    // ============================================
    // TWO FACTOR AUTH TABLE INDEXES
    // ============================================

    if (await this.hasColumn(queryRunner, 'two_factor_auth', 'enabled')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_TWO_FACTOR_ENABLED" ON "two_factor_auth" ("enabled")`,
      );
    }

    // ============================================
    // EVENT STORE TABLE INDEXES
    // ============================================

    if (
      (await this.hasColumn(queryRunner, 'event_store', 'eventName')) &&
      (await this.hasColumn(queryRunner, 'event_store', 'timestamp'))
    ) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_EVENT_STORE_NAME_TIMESTAMP" ON "event_store" ("eventName", "timestamp")`,
      );
    }

    // ============================================
    // NOTIFICATION PREFERENCE TABLE INDEXES
    // ============================================

    if (await this.hasColumn(queryRunner, 'notification_preferences', 'enabled')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_NOTIFICATION_PREF_ENABLED" ON "notification_preferences" ("enabled")`,
      );
    }

    if (
      (await this.hasColumn(queryRunner, 'notification_preferences', 'userId')) &&
      (await this.hasColumn(queryRunner, 'notification_preferences', 'enabled'))
    ) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_NOTIFICATION_PREF_USER_ENABLED" ON "notification_preferences" ("userId", "enabled")`,
      );
    }

    // ============================================
    // JOB LOG TABLE INDEXES
    // ============================================

    if (await this.hasColumn(queryRunner, 'job_logs', 'userId')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_JOB_LOG_USER_ID" ON "job_logs" ("userId") WHERE "userId" IS NOT NULL`,
      );
    }

    if (await this.hasColumn(queryRunner, 'job_logs', 'createdAt')) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_JOB_LOG_CREATED_AT" ON "job_logs" ("createdAt")`,
      );
    }

    // ============================================
    // ANALYTICS OPTIMIZATION
    // ============================================

    if (
      (await this.hasColumn(queryRunner, 'users', 'createdAt')) &&
      (await this.hasColumn(queryRunner, 'users', 'deletedAt'))
    ) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_USER_CREATED_DELETED" ON "users" ("createdAt", "deletedAt")`,
      );
    }

    if (
      (await this.hasColumn(queryRunner, 'quests', 'createdAt')) &&
      (await this.hasColumn(queryRunner, 'quests', 'status'))
    ) {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_QUEST_CREATED_STATUS" ON "quests" ("createdAt", "status")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes in reverse order

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_QUEST_CREATED_STATUS"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USER_CREATED_DELETED"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_JOB_LOG_CREATED_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_JOB_LOG_USER_ID"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_NOTIFICATION_PREF_USER_ENABLED"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_NOTIFICATION_PREF_ENABLED"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_EVENT_STORE_NAME_TIMESTAMP"`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_TWO_FACTOR_ENABLED"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_REFRESH_TOKEN_FAMILY_REVOKED"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_REFRESH_TOKEN_USER_REVOKED_EXPIRES"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_REFRESH_TOKEN_EXPIRES_AT"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_REFRESH_TOKEN_IS_REVOKED"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_REFRESH_TOKEN_FAMILY_ID"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_SUBMISSION_STATUS_CREATED"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_SUBMISSION_QUEST_STATUS_CREATED"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_SUBMISSION_USER_STATUS_CREATED"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_SUBMISSION_REJECTED_AT"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_SUBMISSION_APPROVED_AT"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_SUBMISSION_CREATED_AT"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_NOTIFICATION_USER_TYPE"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_NOTIFICATION_USER_READ_CREATED"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_NOTIFICATION_PRIORITY"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_NOTIFICATION_TYPE"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_NOTIFICATION_CREATED_AT"`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYOUT_QUEST_STATUS"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYOUT_STATUS_RETRY"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYOUT_ADDRESS_STATUS"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYOUT_PROCESSED_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYOUT_CREATED_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYOUT_NEXT_RETRY_AT"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_PAYOUT_TRANSACTION_HASH"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYOUT_SUBMISSION_ID"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYOUT_QUEST_ID"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYOUT_TYPE"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYOUT_STATUS"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_PAYOUT_STELLAR_ADDRESS"`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_QUEST_DELETED_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_QUEST_CREATOR_STATUS"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_QUEST_STATUS_DEADLINE"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_QUEST_CONTRACT_TASK_ID"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_QUEST_DEADLINE"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_QUEST_CREATED_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_QUEST_CREATED_BY"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_QUEST_STATUS"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USER_ROLE_DELETED"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USER_CREATED_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USER_LAST_ACTIVE_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USER_GITHUB_ID"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USER_GOOGLE_ID"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USER_USERNAME"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USER_EMAIL"`);
  }
}
