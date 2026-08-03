import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Composite index serving quest listing's status + deadline access pattern
 * (filter by status, order/filter by deadline). Closes #1967.
 */
export class AddQuestStatusDeadlineIndex1820000000000
  implements MigrationInterface
{
  name = 'AddQuestStatusDeadlineIndex1820000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "idx_quest_status_deadline" ON "quests" ("status", "deadline") WHERE "deletedAt" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_quest_status_deadline"`);
  }
}
