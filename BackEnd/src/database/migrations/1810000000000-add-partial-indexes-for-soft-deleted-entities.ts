import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds partial indexes for soft-deletable entities, matching the
 * `@Index(..., { where: '"deletedAt" IS NULL' })` decorators added as
 * part of PR #2000 (partial indexes for soft-deleted entities).
 *
 * These indexes are correctness-critical for soft-delete-aware queries
 * and can only be expressed via a migration because TypeORM's
 * `synchronize: true` does not correctly manage partial indexes (it
 * fails with "index does not exist" during the drop+create reconcile).
 *
 * The indexes are created via raw SQL `CREATE INDEX ... WHERE` so that
 * Postgres creates a true partial index. They are idempotent only in
 * the sense that running this migration twice would error if the
 * indexes already exist; TypeORM's migrations table prevents that by
 * recording the run.
 */
export class AddPartialIndexesForSoftDeletedEntities1810000000000 implements MigrationInterface {
  name = 'AddPartialIndexesForSoftDeletedEntities1810000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // submissions
    await queryRunner.query(
      `CREATE INDEX "idx_submission_active_quest_status" ON "submissions" ("questId", "status") WHERE "deletedAt" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_submission_active_user_status" ON "submissions" ("userId", "status") WHERE "deletedAt" IS NULL`,
    );

    // notifications
    await queryRunner.query(
      `CREATE INDEX "idx_notification_active_user" ON "notifications" ("userId") WHERE "deletedAt" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notification_active_user_read" ON "notifications" ("userId", "read") WHERE "deletedAt" IS NULL`,
    );

    // payouts
    await queryRunner.query(
      `CREATE INDEX "idx_payout_active_status" ON "payouts" ("status") WHERE "deletedAt" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payout_active_type_status" ON "payouts" ("type", "status") WHERE "deletedAt" IS NULL`,
    );

    // users
    await queryRunner.query(
      `CREATE INDEX "idx_user_active_role" ON "users" ("role") WHERE "deletedAt" IS NULL`,
    );

    // quests
    await queryRunner.query(
      `CREATE INDEX "idx_quest_active_status" ON "quests" ("status") WHERE "deletedAt" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_quest_active_created_by" ON "quests" ("createdBy") WHERE "deletedAt" IS NULL`,
    );

    // refresh tokens
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_token_active_user" ON "refresh_tokens" ("userId") WHERE "deletedAt" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_token_active_family" ON "refresh_tokens" ("familyId") WHERE "deletedAt" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_refresh_token_active_family"`);
    await queryRunner.query(`DROP INDEX "idx_refresh_token_active_user"`);
    await queryRunner.query(`DROP INDEX "idx_quest_active_created_by"`);
    await queryRunner.query(`DROP INDEX "idx_quest_active_status"`);
    await queryRunner.query(`DROP INDEX "idx_user_active_role"`);
    await queryRunner.query(`DROP INDEX "idx_payout_active_type_status"`);
    await queryRunner.query(`DROP INDEX "idx_payout_active_status"`);
    await queryRunner.query(`DROP INDEX "idx_notification_active_user_read"`);
    await queryRunner.query(`DROP INDEX "idx_notification_active_user"`);
    await queryRunner.query(`DROP INDEX "idx_submission_active_user_status"`);
    await queryRunner.query(`DROP INDEX "idx_submission_active_quest_status"`);
  }
}
