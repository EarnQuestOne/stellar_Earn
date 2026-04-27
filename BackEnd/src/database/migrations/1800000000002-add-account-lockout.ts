import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAccountLockout1800000000002 implements MigrationInterface {
  name = 'AddAccountLockout1800000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "failedLoginAttempts" integer DEFAULT 0
    `);
    
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "lockedUntil" timestamp
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "lockedUntil"
    `);
    
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "failedLoginAttempts"
    `);
  }
}
