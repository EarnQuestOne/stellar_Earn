import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: add an optimistic-concurrency `version` column to `quests`.
 *
 * Backs the `@VersionColumn` added to the Quest entity (#2157). Existing rows
 * are backfilled with version 1 so TypeORM's optimistic lock has a valid
 * starting token.
 */
export class AddQuestVersionColumn1830000000000 implements MigrationInterface {
  name = 'AddQuestVersionColumn1830000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quests" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quests" DROP COLUMN IF EXISTS "version"`,
    );
  }
}
