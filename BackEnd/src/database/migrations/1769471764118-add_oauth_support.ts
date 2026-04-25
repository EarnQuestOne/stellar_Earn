import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOAuthSupport1769471764118 implements MigrationInterface {
  name = 'AddOAuthSupport1769471764118';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "stellarAddress" DROP NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "googleId" TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "githubId" TEXT`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_USERS_GOOGLE_ID" ON "users" ("googleId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_USERS_GITHUB_ID" ON "users" ("githubId")`,
    );

    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "userId" UUID`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_REFRESH_TOKEN_USER_ID" ON "refresh_tokens" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_REFRESH_TOKEN_USER_ID"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP COLUMN IF EXISTS "userId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_USERS_GITHUB_ID"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_USERS_GOOGLE_ID"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "githubId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "googleId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "stellarAddress" SET NOT NULL`,
    );
  }
}
