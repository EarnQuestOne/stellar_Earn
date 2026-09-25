import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: add an optimistic-concurrency `version` column to `payouts`.
 *
 * Backs the `@VersionColumn` added to the Payout entity (#2157). Existing rows
 * are backfilled with version 1 so TypeORM's optimistic lock has a valid
 * starting token and concurrent payout state transitions can no longer cause a
 * lost update.
 */
export class AddPayoutVersionColumn1830000000002 implements MigrationInterface {
  name = 'AddPayoutVersionColumn1830000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payouts" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payouts" DROP COLUMN IF EXISTS "version"`,
    );
  }
}
