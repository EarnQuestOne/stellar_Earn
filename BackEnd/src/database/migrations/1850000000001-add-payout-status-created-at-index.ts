import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add the composite index used by payout reconciliation scans:
 * active payouts filtered by status and ordered by creation time.
 */
export class AddPayoutStatusCreatedAtIndex1850000000001 implements MigrationInterface {
  name = 'AddPayoutStatusCreatedAtIndex1850000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_payout_status_created_at"
      ON "payouts" ("status", "createdAt")
      WHERE "deletedAt" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_payout_status_created_at"`,
    );
  }
}
