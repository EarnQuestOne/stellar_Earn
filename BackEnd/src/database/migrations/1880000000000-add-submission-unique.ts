import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubmissionUnique1880000000000 implements MigrationInterface {
  name = 'AddSubmissionUnique1880000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add withdrawn_at column
    await queryRunner.query(`
      ALTER TABLE submissions ADD COLUMN withdrawn_at TIMESTAMP;
    `);

    // First remove any duplicate submissions, keeping only the most recent one for each user-quest pair
    await queryRunner.query(`
      WITH duplicates AS (
        SELECT id, user_id, quest_id,
               ROW_NUMBER() OVER (PARTITION BY user_id, quest_id ORDER BY created_at DESC) as rn
        FROM submissions
        WHERE deleted_at IS NULL
      )
      UPDATE submissions
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
    `);

    // Add unique constraint
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_submission_user_quest ON submissions (user_id, quest_id)
      WHERE deleted_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_submission_user_quest;
    `);
    await queryRunner.query(`
      ALTER TABLE submissions DROP COLUMN withdrawn_at;
    `);
  }
}