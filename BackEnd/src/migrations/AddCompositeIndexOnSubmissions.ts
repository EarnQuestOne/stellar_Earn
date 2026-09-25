import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompositeIndexOnSubmissions implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE INDEX idx_submissions_quest_status ON submissions (quest_id, status);
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX idx_submissions_quest_status;
        `);
  }
}
