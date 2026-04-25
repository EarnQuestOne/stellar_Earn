import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Brings the `refresh_tokens` table in line with the rotation/reuse-detection
 * scheme. Creates the table with the new schema if it doesn't exist; if it
 * does, drops the legacy plaintext `token` column and adds the columns the
 * new `RefreshToken` entity expects.
 *
 * Existing rows are deliberately discarded — they hold plaintext tokens with
 * no `tokenHash` value, so the new code couldn't read them anyway and they
 * are a security liability.
 */
export class AddRefreshTokenRotation1745524800000
  implements MigrationInterface
{
  name = 'AddRefreshTokenRotation1745524800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('refresh_tokens');

    if (!tableExists) {
      await queryRunner.query(`
        CREATE TABLE "refresh_tokens" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "tokenHash" character varying NOT NULL,
          "stellarAddress" character varying NOT NULL,
          "familyId" uuid NOT NULL,
          "replacedByTokenId" uuid,
          "expiresAt" TIMESTAMP NOT NULL,
          "isRevoked" boolean NOT NULL DEFAULT false,
          "revokedAt" TIMESTAMP,
          "revokedReason" character varying(32),
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id")
        )
      `);
    } else {
      // Discard any pre-existing rows: they were stored as plaintext under
      // the old `token` column with no familyId/tokenHash, so they cannot be
      // migrated forward and shouldn't be left around as a security risk.
      await queryRunner.query(`DELETE FROM "refresh_tokens"`);

      await queryRunner.query(`
        ALTER TABLE "refresh_tokens"
          DROP COLUMN IF EXISTS "token"
      `);
      await queryRunner.query(`
        ALTER TABLE "refresh_tokens"
          ADD COLUMN IF NOT EXISTS "tokenHash" character varying NOT NULL
      `);
      await queryRunner.query(`
        ALTER TABLE "refresh_tokens"
          ADD COLUMN IF NOT EXISTS "familyId" uuid NOT NULL
      `);
      await queryRunner.query(`
        ALTER TABLE "refresh_tokens"
          ADD COLUMN IF NOT EXISTS "replacedByTokenId" uuid
      `);
      await queryRunner.query(`
        ALTER TABLE "refresh_tokens"
          ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP
      `);
      await queryRunner.query(`
        ALTER TABLE "refresh_tokens"
          ADD COLUMN IF NOT EXISTS "revokedReason" character varying(32)
      `);
    }

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_tokenHash" ON "refresh_tokens" ("tokenHash")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_stellarAddress" ON "refresh_tokens" ("stellarAddress")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_familyId" ON "refresh_tokens" ("familyId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_refresh_tokens_familyId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_refresh_tokens_stellarAddress"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_refresh_tokens_tokenHash"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
  }
}
