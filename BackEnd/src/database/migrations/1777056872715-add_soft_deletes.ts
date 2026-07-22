import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeletes1777056872715 implements MigrationInterface {
  name = 'AddSoftDeletes1777056872715';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add deletedAt column to User table
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_USER_DELETED_AT" ON "users" ("deletedAt")`,
    );

    // Add deletedAt column to Quest table
    await queryRunner.query(
      `ALTER TABLE "quests" ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_QUEST_DELETED_AT" ON "quests" ("deletedAt")`,
    );

    // Add deletedAt column to Submission table
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_SUBMISSION_DELETED_AT" ON "submissions" ("deletedAt")`,
    );

    // Add deletedAt column to Notification table
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_NOTIFICATION_DELETED_AT" ON "notifications" ("deletedAt")`,
    );

    // Add deletedAt column to Payout table
    await queryRunner.query(
      `ALTER TABLE "payouts" ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_PAYOUT_DELETED_AT" ON "payouts" ("deletedAt")`,
    );

    // Add deletedAt column to RefreshToken table
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_REFRESH_TOKEN_DELETED_AT" ON "refresh_tokens" ("deletedAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_REFRESH_TOKEN_DELETED_AT"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PAYOUT_DELETED_AT"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_NOTIFICATION_DELETED_AT"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_SUBMISSION_DELETED_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_QUEST_DELETED_AT"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USER_DELETED_AT"`);

    // Drop deletedAt columns
    await queryRunner.query(
      `ALTER TABLE "RefreshToken" DROP COLUMN "deletedAt"`,
    );
    await queryRunner.query(`ALTER TABLE "Payout" DROP COLUMN "deletedAt"`);
    await queryRunner.query(
      `ALTER TABLE "Notification" DROP COLUMN "deletedAt"`,
    );
    await queryRunner.query(`ALTER TABLE "Submission" DROP COLUMN "deletedAt"`);
    await queryRunner.query(`ALTER TABLE "Quest" DROP COLUMN "deletedAt"`);
    await queryRunner.query(`ALTER TABLE "User" DROP COLUMN "deletedAt"`);
  }
}
