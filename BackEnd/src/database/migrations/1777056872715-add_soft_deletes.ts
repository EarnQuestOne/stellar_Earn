import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeletes1777056872715 implements MigrationInterface {
  name = 'AddSoftDeletes1777056872715';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add deletedAt column to User table
    await queryRunner.query(
      `ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_USER_DELETED_AT" ON "User" ("deletedAt")`,
    );

    // Add deletedAt column to Quest table
    await queryRunner.query(
      `ALTER TABLE "Quest" ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_QUEST_DELETED_AT" ON "Quest" ("deletedAt")`,
    );

    // Add deletedAt column to Submission table
    await queryRunner.query(
      `ALTER TABLE "Submission" ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_SUBMISSION_DELETED_AT" ON "Submission" ("deletedAt")`,
    );

    // Add deletedAt column to Notification table
    await queryRunner.query(
      `ALTER TABLE "Notification" ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_NOTIFICATION_DELETED_AT" ON "Notification" ("deletedAt")`,
    );

    // Add deletedAt column to Payout table
    await queryRunner.query(
      `ALTER TABLE "Payout" ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_PAYOUT_DELETED_AT" ON "Payout" ("deletedAt")`,
    );

    // Add deletedAt column to RefreshToken table
    await queryRunner.query(
      `ALTER TABLE "RefreshToken" ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_REFRESH_TOKEN_DELETED_AT" ON "RefreshToken" ("deletedAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_REFRESH_TOKEN_DELETED_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYOUT_DELETED_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_NOTIFICATION_DELETED_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_SUBMISSION_DELETED_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_QUEST_DELETED_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USER_DELETED_AT"`);

    // Drop deletedAt columns
    await queryRunner.query(`ALTER TABLE "RefreshToken" DROP COLUMN "deletedAt"`);
    await queryRunner.query(`ALTER TABLE "Payout" DROP COLUMN "deletedAt"`);
    await queryRunner.query(`ALTER TABLE "Notification" DROP COLUMN "deletedAt"`);
    await queryRunner.query(`ALTER TABLE "Submission" DROP COLUMN "deletedAt"`);
    await queryRunner.query(`ALTER TABLE "Quest" DROP COLUMN "deletedAt"`);
    await queryRunner.query(`ALTER TABLE "User" DROP COLUMN "deletedAt"`);
  }
}
