import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add Performance Indexes
 * 
 * This migration adds critical indexes to improve query performance across the application.
 * Focus areas:
 * - User queries by address, email, username, and OAuth IDs
 * - Quest filtering and sorting
 * - Payout tracking and processing
 * - Notification management
 * - Submission analytics
 * - Token security and rotation
 * 
 * Performance Impact:
 * - Expected 50-80% improvement in query response times
 * - Particularly beneficial for user authentication and quest listing
 * 
 * See DATABASE_INDEX_ANALYSIS.md for detailed analysis
 */
export class AddPerformanceIndexes1777213481000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1777213481000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // USER TABLE INDEXES
    // ============================================
    
    // Email index for authentication queries (already has unique constraint in entity)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_USER_EMAIL" ON "users" ("email") WHERE "email" IS NOT NULL`,
    );

    // Username index for profile lookups and leaderboards
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_USER_USERNAME" ON "users" ("username") WHERE "username" IS NOT NULL`,
    );

    // OAuth provider IDs for authentication
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_USER_GOOGLE_ID" ON "users" ("googleId") WHERE "googleId" IS NOT NULL`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_USER_GITHUB_ID" ON "users" ("githubId") WHERE "githubId" IS NOT NULL`,
    );

    // Activity tracking
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_USER_LAST_ACTIVE_AT" ON "users" ("lastActiveAt") WHERE "lastActiveAt" IS NOT NULL`,
    );

    // Analytics and date range queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_USER_CREATED_AT" ON "users" ("createdAt")`,
    );

    // Admin queries - active users by role
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_USER_ROLE_DELETED" ON "users" ("role", "deletedAt")`,
    );

    // ============================================
    // QUEST TABLE INDEXES
    // ============================================

    // Quest status filtering (ACTIVE, COMPLETED, etc.)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_QUEST_STATUS" ON "quests" ("status")`,
    );

    // Creator's quest dashboard
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_QUEST_CREATED_BY" ON "quests" ("createdBy")`,
    );

    // Sorting and analytics
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_QUEST_CREATED_AT" ON "quests" ("createdAt")`,
    );

    // Expiring quests and reminders
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_QUEST_DEADLINE" ON "quests" ("deadline") WHERE "deadline" IS NOT NULL`,
    );

    // Blockchain integration - unique contract task ID
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_QUEST_CONTRACT_TASK_ID" ON "quests" ("contractTaskId")`,
    );

    // Composite: Active quests with upcoming deadlines
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_QUEST_STATUS_DEADLINE" ON "quests" ("status", "deadline") WHERE "deadline" IS NOT NULL`,
    );

    // Composite: Creator's quests by status
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_QUEST_CREATOR_STATUS" ON "quests" ("createdBy", "status")`,
    );

    // Soft delete filtering
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_QUEST_DELETED_AT" ON "quests" ("deletedAt")`,
    );

    // ============================================
    // PAYOUT TABLE INDEXES
    // ============================================

    // User payout history - CRITICAL for UX
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_PAYOUT_STELLAR_ADDRESS" ON "payouts" ("stellarAddress")`,
    );

    // Payout processing and admin dashboard
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_PAYOUT_STATUS" ON "payouts" ("status")`,
    );

    // Payout analytics by type
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_PAYOUT_TYPE" ON "payouts" ("type")`,
    );

    // Quest payout tracking
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_PAYOUT_QUEST_ID" ON "payouts" ("questId") WHERE "questId" IS NOT NULL`,
    );

    // Submission payout verification
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_PAYOUT_SUBMISSION_ID" ON "payouts" ("submissionId") WHERE "submissionId" IS NOT NULL`,
    );

    // Blockchain verification
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_PAYOUT_TRANSACTION_HASH" ON "payouts" ("transactionHash") WHERE "transactionHash" IS NOT NULL`,
    );

    // Retry job scheduling
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_PAYOUT_NEXT_RETRY_AT" ON "payouts" ("nextRetryAt") WHERE "nextRetryAt" IS NOT NULL`,
    );

    // Date queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_PAYOUT_CREATED_AT" ON "payouts" ("createdAt")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_PAYOUT_PROCESSED_AT" ON "payouts" ("processedAt") WHERE "processedAt" IS NOT NULL`,
    );

    // Composite: User's pending payouts
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_PAYOUT_ADDRESS_STATUS" ON "payouts" ("stellarAddress", "status")`,
    );

    // Composite: Retry job processing
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_PAYOUT_STATUS_RETRY" ON "payouts" ("status", "nextRetryAt") WHERE "nextRetryAt" IS NOT NULL`,
    );

    // Composite: Quest payout tracking
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_PAYOUT_QUEST_STATUS" ON "payouts" ("questId", "status") WHERE "questId" IS NOT NULL`,
    );

    // ============================================
    // NOTIFICATION TABLE INDEXES
    // ============================================

    // Notification sorting
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_NOTIFICATION_CREATED_AT" ON "notifications" ("createdAt")`,
    );

    // Filtering by notification type
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_NOTIFICATION_TYPE" ON "notifications" ("type")`,
    );

    // Urgent notifications
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_NOTIFICATION_PRIORITY" ON "notifications" ("priority")`,
    );

    // Composite: Unread notifications sorted by date
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_NOTIFICATION_USER_READ_CREATED" ON "notifications" ("userId", "read", "createdAt")`,
    );

    // Composite: User's notifications by type
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_NOTIFICATION_USER_TYPE" ON "notifications" ("userId", "type")`,
    );

    // ============================================
    // SUBMISSION TABLE INDEXES
    // ============================================

    // Analytics and sorting
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_SUBMISSION_CREATED_AT" ON "submissions" ("createdAt")`,
    );

    // Approval time analytics
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_SUBMISSION_APPROVED_AT" ON "submissions" ("approvedAt") WHERE "approvedAt" IS NOT NULL`,
    );

    // Rejection time analytics
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_SUBMISSION_REJECTED_AT" ON "submissions" ("rejectedAt") WHERE "rejectedAt" IS NOT NULL`,
    );

    // Composite: User's submissions by status
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_SUBMISSION_USER_STATUS_CREATED" ON "submissions" ("userId", "status", "createdAt")`,
    );

    // Composite: Quest submissions by status
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_SUBMISSION_QUEST_STATUS_CREATED" ON "submissions" ("questId", "status", "createdAt")`,
    );

    // Composite: Pending submissions queue
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_SUBMISSION_STATUS_CREATED" ON "submissions" ("status", "createdAt")`,
    );

    // ============================================
    // REFRESH TOKEN TABLE INDEXES
    // ============================================

    // Token family tracking for rotation security
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_REFRESH_TOKEN_FAMILY_ID" ON "refresh_tokens" ("familyId")`,
    );

    // Active token queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_REFRESH_TOKEN_IS_REVOKED" ON "refresh_tokens" ("isRevoked")`,
    );

    // Token cleanup jobs
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_REFRESH_TOKEN_EXPIRES_AT" ON "refresh_tokens" ("expiresAt")`,
    );

    // Composite: User's active tokens
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_REFRESH_TOKEN_USER_REVOKED_EXPIRES" ON "refresh_tokens" ("userId", "isRevoked", "expiresAt") WHERE "userId" IS NOT NULL`,
    );

    // Composite: Token family validation
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_REFRESH_TOKEN_FAMILY_REVOKED" ON "refresh_tokens" ("familyId", "isRevoked")`,
    );

    // ============================================
    // TWO FACTOR AUTH TABLE INDEXES
    // ============================================

    // 2FA enabled users
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_TWO_FACTOR_ENABLED" ON "two_factor_auth" ("enabled")`,
    );

    // ============================================
    // EVENT STORE TABLE INDEXES
    // ============================================

    // Composite: Event history queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_EVENT_STORE_NAME_TIMESTAMP" ON "event_store" ("eventName", "timestamp")`,
    );

    // ============================================
    // NOTIFICATION PREFERENCE TABLE INDEXES
    // ============================================

    // Enabled preferences
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_NOTIFICATION_PREF_ENABLED" ON "notification_preferences" ("enabled")`,
    );

    // User preference lookups (userId, type already has unique constraint)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_NOTIFICATION_PREF_USER_ENABLED" ON "notification_preferences" ("userId", "enabled")`,
    );

    // ============================================
    // JOB LOG TABLE INDEXES
    // ============================================

    // User job tracking
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_JOB_LOG_USER_ID" ON "job_logs" ("userId") WHERE "userId" IS NOT NULL`,
    );

    // Job history queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_JOB_LOG_CREATED_AT" ON "job_logs" ("createdAt")`,
    );

    // ============================================
    // ANALYTICS OPTIMIZATION
    // ============================================

    // User analytics by date
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_USER_CREATED_DELETED" ON "users" ("createdAt", "deletedAt")`,
    );

    // Quest analytics by date and status
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_QUEST_CREATED_STATUS" ON "quests" ("createdAt", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes in reverse order
    
    // Analytics indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_QUEST_CREATED_STATUS"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USER_CREATED_DELETED"`);

    // Job log indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_JOB_LOG_CREATED_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_JOB_LOG_USER_ID"`);

    // Notification preference indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_NOTIFICATION_PREF_USER_ENABLED"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_NOTIFICATION_PREF_ENABLED"`);

    // Event store indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_EVENT_STORE_NAME_TIMESTAMP"`);

    // Two factor auth indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_TWO_FACTOR_ENABLED"`);

    // Refresh token indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_REFRESH_TOKEN_FAMILY_REVOKED"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_REFRESH_TOKEN_USER_REVOKED_EXPIRES"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_REFRESH_TOKEN_EXPIRES_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_REFRESH_TOKEN_IS_REVOKED"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_REFRESH_TOKEN_FAMILY_ID"`);

    // Submission indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_SUBMISSION_STATUS_CREATED"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_SUBMISSION_QUEST_STATUS_CREATED"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_SUBMISSION_USER_STATUS_CREATED"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_SUBMISSION_REJECTED_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_SUBMISSION_APPROVED_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_SUBMISSION_CREATED_AT"`);

    // Notification indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_NOTIFICATION_USER_TYPE"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_NOTIFICATION_USER_READ_CREATED"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_NOTIFICATION_PRIORITY"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_NOTIFICATION_TYPE"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_NOTIFICATION_CREATED_AT"`);

    // Payout indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYOUT_QUEST_STATUS"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYOUT_STATUS_RETRY"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYOUT_ADDRESS_STATUS"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYOUT_PROCESSED_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYOUT_CREATED_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYOUT_NEXT_RETRY_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYOUT_TRANSACTION_HASH"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYOUT_SUBMISSION_ID"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYOUT_QUEST_ID"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYOUT_TYPE"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYOUT_STATUS"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYOUT_STELLAR_ADDRESS"`);

    // Quest indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_QUEST_DELETED_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_QUEST_CREATOR_STATUS"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_QUEST_STATUS_DEADLINE"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_QUEST_CONTRACT_TASK_ID"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_QUEST_DEADLINE"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_QUEST_CREATED_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_QUEST_CREATED_BY"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_QUEST_STATUS"`);

    // User indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USER_ROLE_DELETED"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USER_CREATED_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USER_LAST_ACTIVE_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USER_GITHUB_ID"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USER_GOOGLE_ID"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USER_USERNAME"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USER_EMAIL"`);
  }
}
