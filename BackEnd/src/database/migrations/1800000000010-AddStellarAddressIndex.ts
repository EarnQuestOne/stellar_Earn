import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add covering index on users.stellarAddress
 *
 * Creates a covering index that satisfies the primary auth lookup pattern:
 *   SELECT id, stellarAddress, username, email, role, ...
 *   FROM users
 *   WHERE stellarAddress = :addr AND deletedAt IS NULL
 *
 * The index includes commonly-selected columns so the query can be served
 * entirely from the index (index-only scan), avoiding heap fetches.
 */
export class AddStellarAddressIndex1800000000010
  implements MigrationInterface
{
  name = 'AddStellarAddressIndex1800000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the existing generic index so we can replace it with the
    // covering variant.  The UNIQUE constraint on the column itself
    // already created an implicit index; the explicit @Index() added
    // a second one.  We consolidate into a single covering index.
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_f006c7e9570e2606a14941365a6"`,
    );

    // Covering index: stellarAddress + columns typically selected during
    // auth lookup so Postgres can serve the query from the index alone.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_USERS_STELLAR_ADDRESS_COVERING"
         ON "users" ("stellarAddress")
         INCLUDE ("id", "username", "email", "role", "xp", "level", "deletedAt")
         WHERE "stellarAddress" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_USERS_STELLAR_ADDRESS_COVERING"`,
    );

    // Recreate the plain index that TypeORM managed via @Index()
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_stellarAddress"
         ON "users" ("stellarAddress")`,
    );
  }
}
