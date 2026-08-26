import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AddCursorPaginationIndexes
 *
 * Adds composite indexes required for efficient cursor-based pagination
 * on all list endpoints.
 */
export class AddCursorPaginationIndexes1800000000006 implements MigrationInterface {
  name = 'AddCursorPaginationIndexes1800000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── quests ──────────────────────────────────────────────────────────────

    // Primary list sort: newest first
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_quests_created_at_id"
      ON "quests" ("createdAt" DESC, "id" DESC)
    `);

    // Filtered list: by status + newest first
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_quests_status_created_at_id"
      ON "quests" ("status", "createdAt" DESC, "id" DESC)
    `);

    // Filtered list: by creator
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_quests_created_by_created_at_id"
      ON "quests" ("createdBy", "createdAt" DESC, "id" DESC)
    `);

    // Sort by rewardAmount (alternative sort key)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_quests_reward_amount_id"
      ON "quests" ("rewardAmount" DESC, "id" DESC)
    `);

    // ── submissions ─────────────────────────────────────────────────────────

    // Primary list for a quest: newest first
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_submissions_quest_created_at_id"
      ON "submissions" ("questId", "createdAt" DESC, "id" DESC)
    `);

    // Filtered by status within a quest
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_submissions_quest_status_created_at_id"
      ON "submissions" ("questId", "status", "createdAt" DESC, "id" DESC)
    `);

    // Filtered by userId within a quest
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_submissions_quest_user_created_at_id"
      ON "submissions" ("questId", "userId", "createdAt" DESC, "id" DESC)
    `);

    // User quest history (used by GET /users/:address/quests)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_submissions_user_created_at_id"
      ON "submissions" ("userId", "createdAt" DESC, "id" DESC)
    `);

    // ── users ───────────────────────────────────────────────────────────────

    // Leaderboard: sorted by xp descending, id as tiebreaker
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_xp_id"
      ON "users" ("xp" DESC, "id" DESC)
    `);

    // General user list / search: newest first
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_created_at_id"
      ON "users" ("createdAt" DESC, "id" DESC)
    `);

    // Admin list filtered by role
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_role_created_at_id"
      ON "users" ("role", "createdAt" DESC, "id" DESC)
    `);

    // Search by username (prefix search support)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_username_lower"
      ON "users" (LOWER("username"))
    `);

    // ── payouts ─────────────────────────────────────────────────────────────

    const hasStellarAddress = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns WHERE table_name = 'payouts' AND column_name = 'stellarAddress'
    `);
    if (hasStellarAddress.length > 0) {
      // History per address: newest first
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_payouts_address_created_at_id"
        ON "payouts" ("stellarAddress", "createdAt" DESC, "id" DESC)
      `);

      // Filtered by status within an address
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_payouts_address_status_created_at_id"
        ON "payouts" ("stellarAddress", "status", "createdAt" DESC, "id" DESC)
      `);
    }

    // Admin all-payouts list: newest first
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_payouts_created_at_id"
      ON "payouts" ("createdAt" DESC, "id" DESC)
    `);

    // Cron job: retries due for processing
    const hasNextRetryAt = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns WHERE table_name = 'payouts' AND column_name = 'nextRetryAt'
    `);
    if (hasNextRetryAt.length > 0) {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_payouts_retry_scheduled"
        ON "payouts" ("status", "nextRetryAt")
        WHERE "status" = 'retry_scheduled'
      `);
    }

    // ── notifications ────────────────────────────────────────────────────────

    // User notification list: newest first
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_notifications_user_created_at_id"
      ON "notifications" ("userId", "createdAt" DESC, "id" DESC)
    `);

    // Unread-only filter
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_notifications_user_unread"
      ON "notifications" ("userId", "createdAt" DESC, "id" DESC)
      WHERE "read" = false
    `);

    // Unread count query
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_notifications_user_read_flag"
      ON "notifications" ("userId", "read")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse order

    // notifications
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_notifications_user_read_flag"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_notifications_user_unread"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_notifications_user_created_at_id"`,
    );

    // payouts
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_payouts_retry_scheduled"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_payouts_created_at_id"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_payouts_address_status_created_at_id"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_payouts_address_created_at_id"`,
    );

    // users
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_users_username_lower"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_users_role_created_at_id"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_users_created_at_id"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_users_xp_id"`,
    );

    // submissions
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_submissions_user_created_at_id"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_submissions_quest_user_created_at_id"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_submissions_quest_status_created_at_id"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_submissions_quest_created_at_id"`,
    );

    // quests
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_quests_reward_amount_id"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_quests_created_by_created_at_id"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_quests_status_created_at_id"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_quests_created_at_id"`,
    );
  }
}
