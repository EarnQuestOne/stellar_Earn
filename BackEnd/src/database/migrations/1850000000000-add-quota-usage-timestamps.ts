import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add audit timestamps to quota usage rows.
 *
 * Existing installations already have `createdAt` from the original quota
 * table migration, so both additions are idempotent to support databases that
 * were created from different schema histories.
 */
export class AddQuotaUsageTimestamps1850000000000 implements MigrationInterface {
  name = 'AddQuotaUsageTimestamps1850000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "quota_usages"
      ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE "quota_usages"
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "quota_usages"
      DROP COLUMN IF EXISTS "updatedAt"
    `);

    await queryRunner.query(`
      ALTER TABLE "quota_usages"
      DROP COLUMN IF EXISTS "createdAt"
    `);
  }
}
