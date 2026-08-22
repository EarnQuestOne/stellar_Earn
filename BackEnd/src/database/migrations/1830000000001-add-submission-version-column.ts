import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: add an optimistic-concurrency `version` column to `submissions`.
 *
 * Backs the `@VersionColumn` added to the Submission entity (#2157). Existing
 * rows are backfilled with version 1 so TypeORM's optimistic lock has a valid
 * starting token.
 */
export class AddSubmissionVersionColumn1830000000001 implements MigrationInterface {
  name = 'AddSubmissionVersionColumn1830000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "submissions" DROP COLUMN IF EXISTS "version"`,
    );
  }
}
